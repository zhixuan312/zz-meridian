import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
type Shift = { id: string; nurse: string; ward: string; start: string; end: string; status: 'open' | 'filled' };
function useShifts() {
  const [s, set] = useState<Shift[]>([]);
  useEffect(() => { fetch(`${import.meta.env.VITE_API}/shifts`).then((r) => r.json()).then(set); }, []);
  return s;
}
function Board() { const s = useShifts(); return <div><h1>Open shifts</h1><ul>{s.filter((x) => x.status === 'open').map((x) => <li key={x.id}>{x.ward} {x.start}</li>)}</ul></div>; }
function Nurses() { const s = useShifts(); return <div><h1>Nurses</h1>{[...new Set(s.map((x) => x.nurse))].map((n) => <p key={n}>{n}</p>)}</div>; }
export default function App() { return <BrowserRouter><nav><Link to="/">Board</Link> <Link to="/nurses">Nurses</Link></nav><Routes><Route path="/" element={<Board />} /><Route path="/nurses" element={<Nurses />} /></Routes></BrowserRouter>; }
