import VotesFacilitator from "./VotesFacilitator";

export default async function VotesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <VotesFacilitator roomCode={code} />;
}
