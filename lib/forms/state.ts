export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every result so the client can react to repeated submissions. */
  nonce?: number;
};

export const initialFormState: FormState = { status: "idle" };
