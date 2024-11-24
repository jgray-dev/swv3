import {
  Form,
  useActionData,
  useNavigation,
  useRouteLoaderData,
} from "@remix-run/react";
import React, { useEffect, useRef, useState } from "react";
import { IoIosWarning } from "react-icons/io";
import { PiWarningCircle } from "react-icons/pi";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setSelectedFile("");
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (actionData?.success) {
      formRef.current?.reset();
      setSelectedFile("");
      setPreviewUrl(null);
    }
  }, [actionData]);

  if (!allData?.ok) return null;
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-medium text-slate-100 mb-6 text-center">
        Submit your own picture!
      </h2>

      <Form
        ref={formRef}
        method="post"
        encType="multipart/form-data"
        className="space-y-6 p-8 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
      >
        <div className="space-y-2">
          <label
            htmlFor="image"
            className="block text-sm font-medium text-slate-100"
          >
            Select Image
          </label>
          <div
            className={`
              relative overflow-hidden rounded-lg
              border transition-all duration-200 ease-in-out
              ${
                selectedFile
                  ? "bg-white/20 border-white/30"
                  : "bg-white/10 border-white/20 hover:bg-white/15"
              }
            `}
          >
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
            <div className="flex items-center justify-center py-4 px-3">
              <svg
                className={`w-5 h-5 mr-2 ${
                  selectedFile ? "text-green-400" : "text-slate-400"
                }`}
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-slate-100">
                {selectedFile || "Choose an image"}
              </span>
            </div>
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="mt-4">
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain bg-black/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile("");
                    formRef.current?.reset();
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Fields */}
        <input type="hidden" name="eventType" value={allData.eventType} />
        <input type="hidden" name="eventTime" value={allData.eventTime} />
        <input type="hidden" name="rating" value={allData.rating} />
        <input type="hidden" name="lat" value={allData.lat} />
        <input type="hidden" name="lon" value={allData.lon} />
        <input type="hidden" name="city" value={allData.city} />
        <input type="hidden" name="element" value="userSubmission" />
        <input
          type="hidden"
          name="data"
          value={JSON.stringify(allData.stats)}
        />

        {/* Status Messages */}
        {actionData?.error && (
          <div className="flex items-center p-4 rounded-lg bg-red-500/20 border border-red-500/30">
            <svg
              className="w-5 h-5 text-red-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-400">{actionData.error}</span>
          </div>
        )}

        {actionData?.success && (
          <div className="flex items-center p-4 rounded-lg bg-green-500/20 border border-green-500/30">
            <svg
              className="w-5 h-5 text-green-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm text-green-400">
              Successfully uploaded!
            </span>
          </div>
        )}

        <div
          className={`w-full text-center text-white/50 ${
            !selectedFile ? "opacity-0 h-0" : "opacity-100"
          }`}
        >
          Submitting a <span className={"text-white"}>{allData.eventType}</span>{" "}
          rated <span className={"text-white"}>{allData.rating}</span> on{" "}
          <span className={"text-white"}>
            {new Date(allData.eventTime * 1000).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>{" "}
          at <span className={"text-white"}>{allData.city}</span>
        </div>

        {/*Future event warning*/}
        {allData.eventTime >= Date.now() / 1000 + 2400 &&
          selectedFile &&
          !actionData?.success && (
            <div
              className={
                "flex justify-center items-center text-red-400 text-sm cursor-default"
              }
              title={`You cannot upload a picture from the future!`}
            >
              <IoIosWarning className={"h-6 w-6 fill-red-500 mr-2"} />
              This event hasn't happened yet!
            </div>
          )}

        {/*Relative warning*/}
        {allData.relative === "past" &&
          selectedFile &&
          !actionData?.success && (
            <div
              className={
                "flex justify-center items-center text-orange-400 text-sm cursor-default"
              }
              title={`Make sure the image you're uploading was taken ${allData.eventString
                .split(" ")
                .slice(1)
                .join(" ")}.`}
            >
              <PiWarningCircle className={"h-6 w-6 fill-orange-500 mr-2"} />
              This event happened{" "}
              {allData.eventString.split(" ").slice(1).join(" ")}.
            </div>
          )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !selectedFile ||
            allData.eventTime >= Date.now() / 1000 + 1200
          }
          className={`
            w-full px-4 py-3 rounded-lg
            font-medium text-sm
            transition-all duration-200
            ${
              isSubmitting ||
              !selectedFile ||
              allData.eventTime >= Date.now() / 1000 + 1200
                ? "bg-white/5 border-white/5 text-slate-400 cursor-not-allowed"
                : "bg-white/20 border border-white/20 text-slate-100 hover:bg-white/30 active:bg-white/10"
            }
          `}
        >
          <div className="relative h-5">
            <span
              className={`
                absolute inset-0 w-full
                flex items-center justify-center
                transition-opacity duration-200
                ${isSubmitting ? "opacity-0" : "opacity-100"}
              `}
            >
              Upload Image
            </span>

            {isSubmitting && (
              <span className="absolute inset-0 w-full flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-slate-100"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Uploading...</span>
              </span>
            )}
          </div>
        </button>
      </Form>
    </div>
  );
}
