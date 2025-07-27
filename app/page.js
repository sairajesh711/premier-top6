"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

export default function Home() {
  const router = useRouter();
  const [picks, setPicks] = useState([]);
  const [pool, setPool]   = useState(TEAMS);
  const [msg,  setMsg]    = useState("");
  const [load, setLoad]   = useState(false);
  const [modal, showModal] = useState(false);

  /* ---------------- drag logic -------------- */
  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;

    const fromPool = source.droppableId === "pool";
    const toPool   = destination.droppableId === "pool";

    // pool → picks
    if (fromPool && !toPool) {
      if (picks.length >= 6) return;
      const nextPool = [...pool];
      const [team] = nextPool.splice(source.index, 1);
      const next = [...picks];
      next.splice(destination.index, 0, team);
      setPool(nextPool);
      setPicks(next);
    }
    // picks reorder
    if (!fromPool && !toPool) {
      const next = [...picks];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setPicks(next);
    }
    // picks → pool
    if (!fromPool && toPool) {
      const next = [...picks];
      const [team] = next.splice(source.index, 1);
      const nextPool = [...pool];
      nextPool.splice(destination.index, 0, team);
      setPicks(next);
      setPool(nextPool);
    }
  };

  /* ---------------- helpers ---------------- */
  const buildPayload = (arr) => {
    const obj = {};
    arr.forEach((t, i) => (obj[t.replace(/\s+/g, "_").toLowerCase()] = i + 1));
    pool
      .filter((t) => !arr.includes(t))
      .forEach((t) => (obj[t.replace(/\s+/g, "_").toLowerCase()] = 8));
    return obj;
  };

  const submit = async (arr) => {
    setLoad(true);
    const { error } = await supabase.from("votes").insert([buildPayload(arr)]);
    setLoad(false);
    if (error) {
      setMsg("❌ Submission failed.");
    } else {
      setMsg("🎉 Vote recorded! Redirecting …");
      setTimeout(() => router.push("/results"), 1100);
    }
  };

  const handleSubmit = () => {
    setMsg("");
    if (!picks.length) return setMsg("⚠️ Pick at least one team.");
    if (picks[0] !== "Liverpool") return showModal(true);
    submit(picks);
  };

  const fixAndSubmit = () => {
    const fixed = ["Liverpool", ...picks.filter((t) => t !== "Liverpool")].slice(0, 6);
    setPicks(fixed);
    setPool(TEAMS.filter((t) => !fixed.includes(t)));
    showModal(false);
    submit(fixed);
  };

  /* ---------------- UI ---------------- */
  return (
    <main className="p-6 max-w-lg mx-auto font-sans text-gray-900 dark:text-gray-100">
      {/* header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-500">Premier League Top 6</h1>
        <button onClick={() => router.push("/results")} className="underline">
          View Results
        </button>
      </header>

      {msg && <div className="mb-4 p-4 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">{msg}</div>}

      <p className="mb-3">Drag up to six teams into the box below and order them.</p>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* picks */}
        <Droppable droppableId="top">
          {(prov) => (
            <div ref={prov.innerRef} {...prov.droppableProps} className="mb-6 p-4 border-2 border-dashed border-indigo-300 rounded min-h-[160px] space-y-2">
              {picks.length === 0 && <p className="text-gray-500">Your picks appear here</p>}
              {picks.map((t, i) => (
                <Draggable key={t} draggableId={t} index={i}>
                  {(p) => (
                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="p-3 bg-indigo-600 rounded text-white shadow">
                      {i + 1}. {t}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>

        {/* pool */}
        <h2 className="font-semibold text-indigo-600 mb-2">Available Teams</h2>
        <Droppable droppableId="pool" direction="horizontal">
          {(prov) => (
            <div ref={prov.innerRef} {...prov.droppableProps} className="grid grid-cols-2 gap-2">
              {pool.map((t, i) => (
                <Draggable key={t} draggableId={t} index={i}>
                  {(p, snapshot) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      className={`p-2 h-10 rounded cursor-move select-none transition
                        ${snapshot.isDragging ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"}
                      `}
                    >
                      {t}
                    </div>
                  )}
                </Draggable>
              ))}
              {/* invisible placeholder keeps grid height, preventing flicker */}
              {prov.placeholder && (
                <div
                  style={{ height: 40 }}
                  className="invisible col-span-1 bg-gray-200 rounded"
                />
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button onClick={handleSubmit} disabled={load} className="mt-6 w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
        {load ? "Submitting…" : "Submit Votes"}
      </button>

      {/* witty modal */}
      {modal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded p-6 w-80 text-center shadow-lg">
              <h2 className="text-xl font-bold text-indigo-600 mb-3">⚠️ Lack of Ball knowledge detected!</h2>
              <p className="mb-6">Liverpool isn’t #1. Choose your fate:</p>
              <div className="flex gap-3">
                <button onClick={fixAndSubmit} className="flex-1 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Fix it (YNWA) ❤️
                </button>
                <button onClick={() => { showModal(false); submit(picks); }} className="flex-1 py-2 bg-gray-300 dark:bg-gray-700 rounded hover:bg-gray-400">
                  I’m brave, send it 😎
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}