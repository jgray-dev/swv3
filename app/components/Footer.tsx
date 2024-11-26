export default function Footer() {
  return (
    <div
      className={
        "w-screen bg-transparent pt-8 text-sm text-white/25 text-center pb-4"
      }
    >
      made with ♥ by{" "}
      <a
        href={"https://www.linkedin.com/in/jackson--gray/"}
        target={"_blank"}
        className={
          "relative no-underline after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-left after:scale-x-0 after:bg-white/25 after:transition-transform hover:after:scale-x-100"
        }
      >
        jackson
      </a>
    </div>
  );
}
