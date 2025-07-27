"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const columns = [
  "liverpool",
  "arsenal",
  "manchester_city",
  "manchester_united",
  "chelsea",
  "tottenham",
  "aston_villa",
  "newcastle",
  "brighton",
  "nottingham_forest",
  "bournemouth",
];

export default function Results() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /** helper to compute averages & update UI */
  const fetchResults = useCallback(async () => {
    const { data, error } = await supabase.from("votes").select("*");
    if (error) {
      console.error(error);
      return;
    }
    const averages = columns.map((c) => {
      const avg =
        data.reduce((sum, r) => sum + r[c], 0) / data.length;
      return {
        team: c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        avg,
      };
    });
    averages.sort((a, b) => a.avg - b.avg);
    setRows(averages);
    setLoading(false);
  }, []);

  /** first load + realtime subscription */
  useEffect(() => {
    fetchResults(); // initial

    const channel = supabase
      .channel("votes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => {
          console.log("📡 update → refetch");
          fetchResults();
        }
      )
      .subscribe((status) => {
        console.log("realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResults]);

  if (loading) return <p className="p-6">Loading…</p>;

  const top = rows.slice(0, 6);
  const others = rows.slice(6);

  return (
    <main className="p-6 max-w-xl mx-auto font-sans space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Community Top 6</h1>
        <a href="/" className="text-indigo-600 underline">Vote Again</a>
      </header>

      <section>
        <h2 className="font-semibold text-indigo-700 mb-2">Top 6</h2>
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Team</th>
              <th className="p-2 border">Avg Rank</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={r.team}>
                <td className="p-2 border font-bold">{i + 1}</td>
                <td className="p-2 border">{r.team}</td>
                <td className="p-2 border">{r.avg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="font-semibold text-indigo-700 mb-2">Others</h2>
          <table className="w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Team</th>
                <th className="p-2 border">Avg Rank</th>
              </tr>
            </thead>
            <tbody>
              {others.map((r) => (
                <tr key={r.team}>
                  <td className="p-2 border">{r.team}</td>
                  <td className="p-2 border">{r.avg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}