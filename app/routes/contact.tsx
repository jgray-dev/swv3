import type { ActionFunction } from "@remix-run/cloudflare";
import Footer from "~/components/Footer";
import { Form } from "@remix-run/react";
import React, {useEffect, useState} from "react";
import { json } from "@remix-run/router";

export const action: ActionFunction = async ({ request, context }) => {
  const body = await request.formData();
  const requiredFields = ["name", "email", "message", "cf-turnstile-response"];
  for (const field of requiredFields) {
    if (!body.get(field)) {
      return json(
        {
          error: `Missing required field: ${field}`,
          success: false,
        },
        { status: 400 }
      );
    }
  }
  const name = body.get("name");
  const email = body.get("email");
  const message = body.get("message");
  const token = body.get("cf-turnstile-response");
  const ip = request.headers.get("CF-Connecting-IP");

  if (!token || !ip) {
    return json(
      {
        error: `Token or ip null. ${token} ${ip}`,
        success: false,
      },
      { status: 400 }
    );
  }
  let formData = new FormData();
  formData.append("secret", context.cloudflare.env.TURNSTILE_SECRET);
  formData.append("response", token);
  formData.append("remoteip", ip);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });
  console.log(await result.json())

  return 0;
};

export default function Contact() {

  useEffect(() => {
    // Load the Turnstile script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(script);
    };
  }, []);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div
      className={
        "overflow-y-scroll min-h-screen w-screen bg-gradient-to-br from-blue-800/50 via-purple-900/50 to-purple-800/50"
      }
    >
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Form
          method="post"
          className="space-y-6 bg-white/10 backdrop-blur-sm rounded-lg p-8"
        >
          <h2 className="text-3xl font-bold text-white text-center">
            Contact Us
          </h2>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-white"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 bg-white/20 text-white"
              aria-label="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 bg-white/20 text-white"
              aria-label="Your email address"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-white"
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 bg-white/20 text-white"
              aria-label="Your message"
            />
          </div>

          <div
            className="cf-turnstile"
            data-sitekey="0x4AAAAAAAx9XpnBsPXGv7Q0"
          ></div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Send Message
            </button>
          </div>
        </Form>
      </div>
      <Footer/>
    </div>
  );
}
