import JoinClient from "./JoinClient";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinClient roomCode={code} />;
}
