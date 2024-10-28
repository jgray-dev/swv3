import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "swv3" },
    { name: "swv3", content: "attempt 6??" },
  ];
};


export function loader() {
  return 0
}

export function action() {
  
}


export default function Index() {
  return (<div>hi</div>)
}
