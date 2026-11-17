import { Suspense } from "react";
import { connection } from "next/server";
import { addNote } from "@/app/actions";
import { supabase } from "@/lib/supabase";

type Note = { id: number; content: string; created_at: string };

async function NoteList() {
  await connection();

  const { data, error } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Could not load notes: {error.message}</p>;
  }

  const notes = (data ?? []) as Note[];

  if (notes.length === 0) {
    return <p className="text-zinc-500">No notes yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded border border-zinc-200 p-3">
          <p>{note.content}</p>
          <time className="text-xs text-zinc-500">
            {new Date(note.created_at).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>

      <form action={addNote} className="flex gap-2">
        <input
          name="content"
          required
          placeholder="Write something..."
          className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Add
        </button>
      </form>

      <Suspense fallback={<p className="text-zinc-500">Loading notes...</p>}>
        <NoteList />
      </Suspense>
    </main>
  );
}
