interface ImagePreviewProps {
  src: string;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] p-4">
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain rounded"
      />
    </div>
  );
}
