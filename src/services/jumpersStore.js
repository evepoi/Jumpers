// FILE: src/services/jumpersStore.js
import { db } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const TEMPLATE_COL = "jumpers_templates";
const STATE_COL = "jumpers_state";
const DOC_ID = "default";

export function defaultTemplate() {
  const mk = (id, kind, text) => ({ id, kind, text });

  return {
    version: 2,
    days: {
      mon: [mk("mon-l1", "pickup", "14:03 [레이크시티] 최시온"), mk("mon-l2", "dropoff", "[1부 하차/레이크시티] 이솜")],
      tue: [mk("tue-l1", "pickup", "14:05 [중기유] 최시온"), mk("tue-l2", "pickup", "14:13 [더샵] 김준영")],
      wed: [],
      thu: [],
      fri: [],
    },
  };
}

export function defaultState() {
  return {
    weekShift: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 },
    doneMap: {},
    savedAt: Date.now(),
  };
}

export async function loadTemplate() {
  const ref = doc(db, TEMPLATE_COL, DOC_ID);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveTemplate(template) {
  const ref = doc(db, TEMPLATE_COL, DOC_ID);

  // ✅ merge:false = 삭제까지 정확히 반영
  const payload = {
    version: 2,
    days: template?.days || {},
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: false });
}

export async function loadState() {
  const ref = doc(db, STATE_COL, DOC_ID);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveState(state) {
  const ref = doc(db, STATE_COL, DOC_ID);

  const payload = {
    weekShift: state?.weekShift || defaultState().weekShift,
    doneMap: state?.doneMap || {},
    savedAt: Date.now(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
}
