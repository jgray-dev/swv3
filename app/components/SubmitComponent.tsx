import { useRouteLoaderData } from "@remix-run/react";
import { Form, useSubmit } from "@remix-run/react";
import React, { useState, useRef } from "react";
import { LoaderData } from "~/.server/interfaces";

export default function SubmitComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  if (!allData?.ok) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setSubmitStatus('idle');
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedImage || !allData) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("rating", allData.rating.toString());
      formData.append("lat", allData.lat.toString());
      formData.append("lon", allData.lon.toString());

      submit(formData, {
         method: "post",
        encType: "multipart/form-data",
      });

      setSubmitStatus('success');
      if (formRef.current) formRef.current.reset();
      setSelectedImage(null);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyles = () => {
    switch (submitStatus) {
      case 'error':
        return 'bg-red-500/20 border-red-500/30';
      case 'success':
        return 'bg-green-500/20 border-green-500/30';
      default:
        return 'bg-white/20 border-white/10';
    }
  };

  return (
    <Form
      ref={formRef}
      onSubmit={handleSubmit}
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
          bg-white/10 backdrop-blur-sm
          border border-white/20
          focus-within:outline-none 
          focus-within:ring-2 
          focus-within:ring-blue-400/50
          focus-within:bg-white/20 
          focus-within:backdrop-blur-md
          transition-all duration-200
          cursor-pointer
          hover:bg-white/20
        `}>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            required
          />
          <div className="flex items-center justify-center text-slate-100">
            <span>{selectedImage ? selectedImage.name : 'Choose an image'}</span>
          </div>
        </div>
      </div>

      {submitStatus === 'error' && (
        <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
          <span className="text-sm text-red-400">{errorMessage}</span>
        </div>
      )}

      {submitStatus === 'success' && (
        <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
          <span className="text-sm text-green-400">Successfully uploaded!</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedImage || isSubmitting}
        className={`
          w-full px-4 py-2 rounded-lg
          ${getStatusStyles()}
          backdrop-blur-sm
          hover:bg-white/30 
          active:bg-white/10
          disabled:bg-white/5 
          disabled:border-white/5
          disabled:cursor-not-allowed
          transition-all duration-200
          text-slate-100
          flex items-center justify-center space-x-2
        `}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
            <span>Uploading...</span>
          </>
        ) : (
          <span>Upload Image</span>
        )}
      </button>
    </Form>
  );
}