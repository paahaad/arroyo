import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
} from '@chakra-ui/react';
import { JSONSchema7 } from 'json-schema';
import { Form, useFormik } from 'formik';

import Ajv from 'ajv';
import { useEffect, useMemo } from 'react';

function StringWidget({
  path,
  title,
  description,
  placeholder,
  required,
  value,
  errors,
  onChange,
}: {
  path: string;
  title: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  errors: any;
  onChange: (e: React.ChangeEvent<any>) => void;
}) {
  return (
    <FormControl isRequired={required} isInvalid={errors[path]}>
      <FormLabel>{title}</FormLabel>
      <Input
        name={path}
        type="text"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e)}
      />
      {errors[path] ? (
        <FormErrorMessage>{errors[path]}</FormErrorMessage>
      ) : (
        description && <FormHelperText>{description}</FormHelperText>
      )}
    </FormControl>
  );
}

function SelectWidget({
  path,
  title,
  description,
  placeholder,
  options,
  value,
  onChange,
}: {
  path: string;
  title?: string;
  description?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (e: React.ChangeEvent<any>) => void;
}) {
  return (
    <FormControl>
      {title && <FormLabel>{title}</FormLabel>}
      <Select
        placeholder={placeholder}
        name={path}
        value={value}
        onChange={onChange}
        borderColor={'gray.600'}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {description && <FormHelperText>{description}</FormHelperText>}
    </FormControl>
  );
}

export function FormInner({
  schema,
  onChange,
  path,
  values,
  errors,
}: {
  schema: JSONSchema7;
  onChange: (e: React.ChangeEvent<any>) => void;
  path?: string;
  values: any;
  errors: any;
}) {
  useEffect(() => {
    if (!schema.properties || Object.keys(schema.properties).length == 0) {
      // @ts-ignore
      onChange({ target: { name: path, value: {} } });
    }
  }, [schema]);

  return (
    <Stack spacing={6}>
      {Object.keys(schema.properties || {}).map(key => {
        const property = schema.properties![key];
        if (typeof property == 'object') {
          switch (property.type) {
            case 'string':
              if (property.enum) {
                return (
                  <SelectWidget
                    path={(path ? `${path}.` : '') + key}
                    key={key}
                    title={property.title || key}
                    description={property.description}
                    options={property.enum.map(value => ({ value, label: value }))}
                    value={values[key]}
                    onChange={onChange}
                  />
                );
              } else {
                return (
                  <StringWidget
                    path={(path ? `${path}.` : '') + key}
                    key={key}
                    title={property.title || key}
                    description={property.description}
                    required={schema.required?.includes(key)}
                    // @ts-ignore
                    placeholder={property.examples ? (property.examples[0] as string) : undefined}
                    value={values[key]}
                    errors={errors}
                    onChange={onChange}
                  />
                );
              }
            case 'object': {
              if (property.oneOf) {
                const typeKey = '__meta.' + key + '.type';
                const value = ((values.__meta || {})[key] || {}).type;
                return (
                  <fieldset key={key} style={{ border: '1px solid #888', borderRadius: '8px' }}>
                    <legend
                      style={{ marginLeft: '8px', paddingLeft: '16px', paddingRight: '16px' }}
                    >
                      {property.title || key}
                    </legend>
                    <Stack p={4}>
                      <SelectWidget
                        path={typeKey}
                        description={property.description}
                        options={property.oneOf.map(oneOf => ({
                          // @ts-ignore
                          value: oneOf.title!,
                          // @ts-ignore
                          label: oneOf.title!,
                        }))}
                        value={value}
                        onChange={onChange}
                      />

                      <Box p={4}>
                        <FormInner
                          path={key}
                          // @ts-ignore
                          schema={property.oneOf.find(x => x.title == value) || property.oneOf[0]}
                          errors={errors}
                          onChange={onChange}
                          values={values[key] || {}}
                        />
                      </Box>
                    </Stack>
                  </fieldset>
                );
              }
            }
          }
        }
      })}
    </Stack>
  );
}

export function JsonForm({
  schema,
  onSubmit,
  error,
  button = "Create",
}: {
  schema: JSONSchema7;
  onSubmit: (values: any) => Promise<void>;
  error: string | null;
  button: string;
}) {
  const ajv = useMemo(() => new Ajv(), [schema]);

  const formik = useFormik({
    initialValues: {
      name: '',
    },
    onSubmit,
    validate: values => {
      const errors: any = {};

      if (!values.name || values.name.length == 0) {
        errors.name = 'Name is required';
      }

      let validate = ajv.compile(schema);
      let valid = validate(values);

      if (!valid) {
        validate.errors?.forEach(error => {
          const path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
          errors[path] = error.message;
        });
      }

      return errors;
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <FormControl isRequired={true} pb={8}>
        <FormLabel>Connection Name</FormLabel>
        <Input
          name="name"
          type="text"
          placeholder="Connection Name"
          value={formik.values.name}
          onChange={formik.handleChange}
        />
        <FormHelperText>Enter a name to identify this connection</FormHelperText>
      </FormControl>

      <FormInner
        schema={schema}
        onChange={formik.handleChange}
        values={formik.values}
        errors={formik.errors}
      />

      { error && <Alert mt={8} status="error">
          <AlertIcon />
          {error}
        </Alert> }

      <Button mt={8} mb={4} type="submit" isLoading={formik.isSubmitting}>
        {button}
      </Button>
    </form>
  );
}
