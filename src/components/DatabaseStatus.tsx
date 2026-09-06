import { Alert } from "./ui";

export function DatabaseStatus({ message }: { message: string }) {
  return (
    <Alert tone="warn">
      <p className="font-semibold">Jobbenmin er oppe, men databasen er ikke tilkoblet.</p>
      <p className="mt-1">{message}</p>
    </Alert>
  );
}
