import { useEffect, useState } from "react";
import { useUser } from "./useUser";

export function useLoads() {
  const [loads, setLoads] = useState([]);
  const activeUser = useUser();

  if (!activeUser) return;

  useEffect(() => {

  },[])
  return [loads]
}
