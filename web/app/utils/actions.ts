import type { ZodError, ZodSchema } from "zod";

interface ValidateFormDataInput {
  request: Request;
  schema: ZodSchema;
}

type ActionErrors<T> = Partial<Record<keyof T, string>>;

export async function validateFormData<ActionInput>({
  request,
  schema,
}: ValidateFormDataInput) {
  const body = Object.fromEntries(await request.formData());
  try {
    const formData = schema.parse(body) as ActionInput;
    return { formData, errors: null };
  } catch (error) {
    const errors = error as ZodError<ActionInput>;

    return {
      formData: body,
      errors: errors.issues.reduce<ActionErrors<ActionInput>>((acc, curr) => {
        const key = curr.path[0] as keyof ActionInput;
        acc[key] = curr.message;
        return acc;
      }, {}),
    };
  }
}
