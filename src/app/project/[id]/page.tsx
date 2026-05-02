"use client";

import { useParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import AudioUpload from "@/components/AudioUpload";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

export default function ProjectEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then(setProject);
  }, [projectId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            {project?.name || "Loading..."}
          </h1>
        </div>
        <UserButton />
      </header>

      {/* Editor Panels */}
      <main className="flex-1 grid grid-cols-3 grid-rows-2 gap-4 p-4">
        {/* Audio Upload & Waveform */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Audio / Waveform</h2>
          <AudioUpload projectId={projectId} />
          <div className="mt-4 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
            Waveform viewer placeholder
          </div>
        </div>

        {/* Layout Editor */}
        <div className="row-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Layout Editor</h2>
          <div className="h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm min-h-[200px]">
            Drag fixtures onto your house layout here
          </div>
        </div>

        {/* Timeline Editor */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Timeline Editor</h2>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
            Effect blocks timeline placeholder
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Preview</h2>
          <div className="h-32 bg-gray-900 rounded flex items-center justify-center text-gray-500 text-sm">
            Live preview placeholder
          </div>
        </div>
      </main>
    </div>
  );
}
