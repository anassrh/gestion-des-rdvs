import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const appointmentMutation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.enum([
        "create_booking",
        "admin_create_appointment",
        "manage_appointment",
        "admin_change_appointment",
      ]),
      input: z.record(z.unknown()),
      accessToken: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest() as Request & { waitUntil?: (task: Promise<void>) => void };
    const { executeAppointmentMutation, mutationTransport } =
      await import("./appointment-mutation.server");
    const result = await executeAppointmentMutation(
      data.name,
      data.input,
      mutationTransport(data.accessToken),
      process.env,
      undefined,
      request.waitUntil?.bind(request),
    );
    // RPC payloads are JSON. Keep the server-function wire type explicitly serializable.
    return { data: JSON.stringify(result.data ?? null), error: result.error };
  });
