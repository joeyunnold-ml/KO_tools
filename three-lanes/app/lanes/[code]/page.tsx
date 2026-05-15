import LanesFacilitator from "./LanesFacilitator";

export default async function LanesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <LanesFacilitator roomCode={code} />;
}
