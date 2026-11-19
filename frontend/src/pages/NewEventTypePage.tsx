import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { Link } from "react-router";
import { createEventType } from "../generated/sdk.gen.ts";

const title = "Новый тип встречи";
const emptyForm = { id: "", title: "", description: "", duration: "30" };
type Form = typeof emptyForm;
type Errors = Partial<Record<keyof Form, string>>;

// The contract's rules for an event type, checked before sending; the server checks lengths too.
function check(form: Form) {
  const errors: Errors = {};
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.id)) {
    errors.id = "Только строчная латиница, цифры и дефис";
  }
  if (!form.title.trim()) errors.title = "Укажите название";
  const duration = Number(form.duration);
  if (!Number.isInteger(duration) || duration < 15 || duration > 540 || duration % 15 !== 0) {
    errors.duration = "От 15 до 540 минут, кратно 15";
  }
  return errors;
}

export default function NewEventTypePage() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [createdId, setCreatedId] = useState<string>();

  const field = (key: keyof Form) => ({
    value: form[key],
    error: errors[key],
    onChange: ({ currentTarget }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((form) => ({ ...form, [key]: currentTarget.value })),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = check(form);
    setErrors(found);
    setFailed(false);
    setCreatedId(undefined);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    const { data, error } = await createEventType({
      body: {
        id: form.id,
        title: form.title,
        // An empty description is left out: no description means no field.
        description: form.description || undefined,
        durationMinutes: Number(form.duration),
      },
    });
    setPending(false);
    if (data) {
      setCreatedId(data.id);
      setForm(emptyForm);
    } else if (error?.code === "EVENT_TYPE_ID_TAKEN") {
      setErrors({ id: "Такой id уже занят" });
    } else {
      setFailed(true);
    }
  }

  return (
    <Container component="main" size="xs" py="xl">
      <title>{title}</title>
      <Stack gap="lg">
        <Title>{title}</Title>
        {createdId && (
          <Alert color="green" title="Тип встречи создан">
            <Anchor component={Link} to={`/book/${createdId}`}>
              {`${window.location.origin}/book/${createdId}`}
            </Anchor>
          </Alert>
        )}
        {/* noValidate: the page shows its own messages instead of the browser's. */}
        <form noValidate onSubmit={submit}>
          <Stack gap="md">
            <TextInput label="id" placeholder="intro-30" {...field("id")} />
            <TextInput label="Название" {...field("title")} />
            <Textarea label="Описание" rows={4} {...field("description")} />
            <TextInput type="number" step={15} label="Длительность, мин." {...field("duration")} />
            {failed && <Alert color="red">Не удалось создать тип встречи, проверьте данные</Alert>}
            <Group>
              <Button type="submit" loading={pending}>
                Создать
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
