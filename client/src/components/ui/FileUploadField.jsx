import { useEffect, useMemo, useState } from "react";
import { getAssetUrl } from "../../utils/assets";

const FileUploadField = ({
  label,
  accept,
  buttonLabel,
  helpText,
  file,
  onFileChange,
  existingUrl,
  existingLabel,
  imagePreview = false,
  className = ""
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const resolvedExistingUrl = useMemo(() => getAssetUrl(existingUrl), [existingUrl]);

  useEffect(() => {
    if (!file || !imagePreview) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, imagePreview]);

  return (
    <label className={`block space-y-2 ${className}`}>
      {label && <span className="label-text">{label}</span>}
      <div className="rounded-3xl border border-dashed border-white/16 bg-slate-950/45 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <input
              type="file"
              accept={accept}
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-2xl file:border-0 file:bg-sky-600/30 file:px-4 file:py-2 file:font-semibold file:text-sky-100 hover:file:bg-sky-500/40"
            />
            {helpText && <p className="text-xs text-slate-300">{helpText}</p>}
            {file && <p className="text-sm text-slate-300">Selected: {file.name}</p>}
            {!file && existingLabel && <p className="text-sm text-slate-300">Current: {existingLabel}</p>}
            {!file && resolvedExistingUrl && !existingLabel && (
              <a className="text-sm font-medium text-sky-200 hover:text-sky-100" href={resolvedExistingUrl} target="_blank" rel="noreferrer">
                View current file
              </a>
            )}
          </div>

          {imagePreview && (previewUrl || resolvedExistingUrl) && (
            <img
              src={previewUrl || resolvedExistingUrl}
              alt={buttonLabel || label || "Uploaded file preview"}
              className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
            />
          )}
        </div>
      </div>
    </label>
  );
};

export default FileUploadField;
