import type { Metadata } from "next";
import { SearchView } from "@/app/search/search-view";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for a game to track, rate and add to your library.",
};

export default function SearchPage() {
  return <SearchView />;
}
