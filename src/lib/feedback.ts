import { toast } from "sonner";
export async function attempt(action: () => unknown | Promise<unknown>) {
  try {
    await action();
    return true;
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to save this change. Please try again.",
    );
    return false;
  }
}
