import { createFileRoute } from "@tanstack/react-router";
import { TrackOrderPage } from "@/components/dashboard/TrackOrderPage";

export const Route = createFileRoute("/dashboard/track")({
  ssr: false,
  component: TrackOrderPage,
});
