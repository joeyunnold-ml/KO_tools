import CanvasFacilitator from "./CanvasFacilitator";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <CanvasFacilitator roomCode={code} />;
}
