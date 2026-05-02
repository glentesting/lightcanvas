"use client";

import { useState } from "react";

interface AudioUploadProps {
  projectId: string;
}

export default function AudioUpload({ projectId }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);

    try {
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {fileName ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-600">&#10003;</span>
          <span className="text-gray-700">{fileName}</span>
          <button
            onClick={() => setFileName(null)}
            className="text-blue-600 hover:underline text-xs ml-2"
          >
            Replace
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition text-sm">
          {uploading ? "Uploading..." : "Upload Song"}
          <input
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
