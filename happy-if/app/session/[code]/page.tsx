import SessionFacilitator from "./SessionFacilitator";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <SessionFacilitator roomCode={code} />;
}
