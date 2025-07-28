"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

/* ---------- constants ---------- */
const TEAMS = [
  "Liverpool",
  "Arsenal",
  "Manchester City",
  "Manchester United",
  "Chelsea",
  "Tottenham",
  "Aston Villa",
  "Newcastle",
  "Brighton",
  "Nottingham Forest",
  "Bournemouth",
];

/* ---------- component ---------- */
export default function Home() {
  const router = useRouter();

  /* state */
  const [picks, setPicks]       = useState([]);           // user top-6
  const [pool, setPool]         = useState(TEAMS);        // remaining
  const [msg, setMsg]           = useState("");           // banner
  const [loading, setLoading]   = useState(false);
 
  const [modal, setModal]       = useState({ open: false, reason: "", spurs: false });

  /* ---------- drag-and-drop ---------- */
  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const fromPool = source.droppableId === "pool";
    const toPool   = destination.droppableId === "pool";

    /* pool → picks */
    if (fromPool && !toPool) {
      if (picks.length >= 6) return;
      const np = [...pool];
      const [team] = np.splice(source.index, 1);
      const nx = [...picks];
      nx.splice(destination.index, 0, team);
      setPool(np);
      setPicks(nx);
    }

    /* reorder picks */
    if (!fromPool && !toPool) {
      const nx = [...picks];
      const [move] = nx.splice(source.index, 1);
      nx.splice(destination.index, 0, move);
      setPicks(nx);
    }

    /* picks → pool */
    if (!fromPool && toPool) {
      const nx = [...picks];
      const [team] = nx.splice(source.index, 1);
      const np = [...pool];
      np.splice(destination.index, 0, team);
      setPicks(nx);
      setPool(np);
    }
  };

  /* ---------- helpers ---------- */
  const buildPayload = (arr) => {
    const obj = {};
    arr.forEach((t, i) => (obj[t.replace(/\s+/g, "_").toLowerCase()] = i + 1));
    pool
      .filter((t) => !arr.includes(t))
      .forEach((t) => (obj[t.replace(/\s+/g, "_").toLowerCase()] = 8));
    return obj;
  };

  const insertVote = async (arr) => {
    setLoading(true);
    const { error } = await supabase.from("votes").insert([buildPayload(arr)]);
    setLoading(false);
    if (error) {
      console.error(error);
      setMsg("❌ Submission failed.");
    } else {
      setMsg("🎉 Vote recorded! Redirecting …");
      setTimeout(() => router.push("/results"), 1100);
    }
  };

  /* ---------- submit flow ---------- */
  const handleSubmit = async () => {
    setMsg("");
    if (!picks.length) return setMsg("⚠️ Pick at least one team.");

    // call the serverless AI check
    const res = await fetch("/api/checkPick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks }),
    });
    const { verdict, reason } = await res.json();

    if (verdict === "troll") {
      const spurs = (picks[0] || "").toLowerCase() === "tottenham";
      setModal({
        open: true,
        spurs,
        reason: spurs
          ? "What do we think of Tottenham?"
          : reason || "Are you trolling?",
      });
      return;                   // block submit
    }

    insertVote(picks);          // good to go
  };

  /* ---------- hard “fix it” ---------- */
  const fixLiverpool = () => {
    const fixed = ["Liverpool", ...picks.filter((t) => t !== "Liverpool")].slice(0, 6);
    setPicks(fixed);
    setPool(TEAMS.filter((t) => !fixed.includes(t)));
  };

  /* ---------- UI ---------- */
  return (
    <main className="p-6 max-w-lg mx-auto font-sans text-gray-900 dark:text-gray-100">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-500">Premier League Top 6</h1>
        <button onClick={() => router.push("/results")} className="underline">
          View Results
        </button>
      </header>

      {msg && (
        <div className="mb-4 p-4 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
          {msg}
        </div>
      )}

      <p className="mb-3">Drag up to six teams into the box below and order them.</p>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Picks area */}
        <Droppable droppableId="top">
          {(prov) => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              className="mb-6 p-4 border-2 border-dashed border-indigo-300 rounded min-h-[160px] space-y-2"
            >
              {picks.length === 0 && <p className="text-gray-500">Your picks appear here</p>}
              {picks.map((t, i) => (
                <Draggable key={t} draggableId={t} index={i}>
                  {(p) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      className="p-3 bg-indigo-600 text-white rounded shadow select-none"
                    >
                      {i + 1}. {t}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>

        {/* Pool */}
        <h2 className="font-semibold text-indigo-600 mb-2">Available Teams</h2>
        <Droppable droppableId="pool" direction="horizontal">
          {(prov) => (
            <div ref={prov.innerRef} {...prov.droppableProps} className="grid grid-cols-2 gap-2">
              {pool.map((t, i) => (
                <Draggable key={t} draggableId={t} index={i}>
                  {(p, snap) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      className={`p-2 h-10 rounded select-none transition 
                        ${snap.isDragging
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                    >
                      {t}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
              {/* Invisible placeholder to stop grid collapse */}
              <div style={{ height: 40 }} className="invisible" />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
      >
        {loading ? "Submitting…" : "Submit Votes"}
      </button>

      {/* Troll modal */}
      {modal.open &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 w-80 rounded text-center space-y-4 shadow-lg">
              <h2 className="text-xl font-bold text-indigo-600">🤡 Football Fraud!</h2>
              <p>{modal.reason}</p>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2 bg-rose-600 text-white rounded hover:bg-rose-700"
                  onClick={() => setModal({ ...modal, open: false })}
                >
                  💩 Change my pick
                </button>
                <button
                  className="flex-1 py-2 bg-rose-600 text-white rounded hover:bg-rose-700"
                  onClick={() => setModal({ ...modal, open: false })}
                >
                  💩 Change my pick
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}