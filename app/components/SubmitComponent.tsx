import { useRouteLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import React, { useEffect, useRef, useState } from "react";
import { LoaderData } from "~/.server/interfaces";

interface ActionData {
  success: boolean;
  error?: string;
}

export default function SubmitComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      formRef.current?.reset();
      setSelectedFile("");
    }
  }, [actionData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileName = e.target.files?.[0]?.name || "";
    setSelectedFile(fileName);
  };

  if (!allData?.ok) return null;

  return (
    <div className="md:max-w-lg max-w-full md:mx-auto mx-4 mt-4">
      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="p-6 space-y-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
      >
        <div className="space-y-2">
          <label
            htmlFor="image"
            className="block text-sm font-medium text-slate-100"
          >
            Select Image
          </label>
          <div className={`
            relative w-full p-4 rounded-lg 
            bg-white/10 border border-white/20 
            hover:bg-white/20 transition-all
            ${selectedFile ? 'bg-white/20' : ''}
          `}>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-center text-slate-100">
              <span>{selectedFile || 'Choose an image'}</span>
            </div>
          </div>
        </div>

        {/* Hidden fields for additional data */}
        <input type="hidden" name="rating" value={allData.rating}/>
        <input type="hidden" name="lat" value={allData.lat}/>
        <input type="hidden" name="lon" value={allData.lon}/>
        <input type="hidden" name="city" value={allData.city}/>
        <input type="hidden" name="data" value={JSON.stringify(allData.stats)}/>

        {actionData?.error && (
          <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <span className="text-sm text-red-400">{actionData.error}</span>
          </div>
        )}

        {actionData?.success && (
          <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-sm text-green-400">Successfully uploaded!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !selectedFile}
          className={`
            w-full px-4 py-2 rounded-lg 
            bg-white/20 border border-white/20 
            hover:bg-white/30 active:bg-white/10 
            transition-all text-slate-100
            disabled:bg-white/5 disabled:border-white/5 
            disabled:cursor-not-allowed
            relative
          `}
        >
          <span className={`
            flex items-center justify-center
            transition-opacity duration-200
            ${isSubmitting ? 'opacity-0' : 'opacity-100'}
          `}>
            Upload Image
          </span>

          {isSubmitting && (
            <span className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"/>
              <span>Uploading...</span>
            </span>
          )}
        </button>
      </Form>
    </div>
  );
}