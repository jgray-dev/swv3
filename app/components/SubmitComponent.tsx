import { useRouteLoaderData } from "@remix-run/react";
import { Form, useSubmit } from "@remix-run/react";
import React, { useState, useRef } from "react";
import { LoaderData } from "~/.server/interfaces";

export default function SubmitComponent() {
  const allData = useRouteLoaderData<LoaderData>("routes/_index");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  if (!allData?.ok) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedImage || !allData) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("allData", JSON.stringify(allData));

    submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    });

    setIsSubmitting(false);
    if (formRef.current) formRef.current.reset();
    setSelectedImage(null);
  };

  return (
    <Form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
      encType="multipart/form-data"
    >
      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-2">
          Select Image
        </label>
        <input
          type="file"
          id="image"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={!selectedImage || isSubmitting}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </Form>
  );
}