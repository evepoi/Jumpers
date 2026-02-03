// FILE: src/services/jumpersStore.js
import { db } from "@/firebase";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const TEMPLATE_COL = "jumpers_templates";
const STATE_COL = "jumpers_state";
const DOC_ID = "default";

/** =========================
 *  Defaults (현재 UI 구조 기준)
 *  ========================= */
export function defaultTemplate() {
  return {
    version: 3,
    routes: {
      mon: { pickup: [], dropoff: [] },
      tue: {
        pickup: [
          { id: "tue-pu-1405-junggiyu", time: "14:05", place: "중기유" },
          { id: "tue-pu-1413-thesharp", time: "14:13", place: "더샵" },
        ],
        dropoff: [
          { id: "tue-do-1600-junggiyu", time: "16:00", place: "중기유" },
          { id: "tue-do-1610-thesharp", time: "16:10", place: "더샵" },
        ],
      },
      wed: {
        pickup: [
          { id: "wed-pu-1400-hoban", time: "14:00", place: "호반정문" },
          { id: "wed-pu-1410-lake", time: "14:10", place: "레이크시티" },
        ],
        dropoff: [{ id: "wed-do-1610-lake", time: "16:10", place: "레이크시티" }],
      },
      thu: { pickup: [{ id: "thu-pu-1420-sangga", time: "14:20", place: "상가앞" }], dropoff: [] },
      fri: { pickup: [], dropoff: [] },
    },
    roster: [
      {
        id: "p1",
        name: "최시온",
        assign: {
          mon: { pickupPlace: "", dropoffPlace: "" },
          tue: { pickupPlace: "중기유", dropoffPlace: "더샵" },
          wed: { pickupPlace: "", dropoffPlace: "" },
          thu: { pickupPlace: "", dropoffPlace: "" },
          fri: { pickupPlace: "", dropoffPlace: "" },
        },
      },
      {
        id: "p2",
        name: "김준영",
        assign: {
          mon: { pickupPlace: "", dropoffPlace: "" },
          tue: { pickupPlace: "더샵", dropoffPlace: "더샵" },
          wed: { pickupPlace: "", dropoffPlace: "" },
          thu: { pickupPlace: "", dropoffPlace: "" },
          fri: { pickupPlace: "", dropoffPlace: "" },
        },
      },
      {
        id: "p3",
        name: "정사랑",
        assign: {
          mon: { pickupPlace: "", dropoffPlace: "" },
          tue: { pickupPlace: "", dropoffPlace: "" },
          wed: { pickupPlace: "레이크시티", dropoffPlace: "레이크시티" },
          thu: { pickupPlace: "", dropoffPlace: "" },
          fri: { pickupPlace: "", dropoffPlace: "" },
        },
      },
    ],
  };
}

export function defaultState() {
  return {
    // shiftMap: `${mode}:${dayKey}:${stopId}` -> number
    shiftMap: {},
    // doneMap: `${occWeekStartIso}:${mode}:${dayKey}:${stopId}` -> doneAt(ms)
    doneMap: {},
    savedAt: Date.now(),
  };
}

function templateRef() {
  return doc(db, TEMPLATE_COL, DOC_ID);
}
function stateRef() {
  return doc(db, STATE_COL, DOC_ID);
}

/** =========================
 *  Ensure docs exist
 *  ========================= */
async function ensureTemplateDoc() {
  const ref = templateRef();
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const tpl = defaultTemplate();
  await setDoc(
    ref,
    { ...tpl, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: false }
  );
  return tpl;
}

async function ensureStateDoc() {
  const ref = stateRef();
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const st = defaultState();
  await setDoc(
    ref,
    { ...st, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
  return st;
}

/** =========================
 *  Save
 *  ========================= */
export async function saveTemplate(template) {
  const ref = templateRef();

  const payload = {
    version: 3,
    routes: template?.routes || defaultTemplate().routes,
    roster: template?.roster || [],
    updatedAt: serverTimestamp(),
  };

  // ✅ merge:false: 삭제도 정확히 반영
  await setDoc(ref, payload, { merge: false });
}

export async function saveState(state) {
  const ref = stateRef();

  const payload = {
    shiftMap: state?.shiftMap || {},
    doneMap: state?.doneMap || {},
    savedAt: Date.now(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
}

/** =========================
 *  Realtime subscribe (핵심)
 *  ========================= */
export function subscribeTemplate(onData, onError) {
  const ref = templateRef();
  let unsub = null;

  (async () => {
    try {
      await ensureTemplateDoc();
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) return onData?.(defaultTemplate());
          const data = snap.data() || {};
          // 방어: 최소 필드 보장
          onData?.({
            version: data.version ?? 3,
            routes: data.routes ?? defaultTemplate().routes,
            roster: Array.isArray(data.roster) ? data.roster : [],
          });
        },
        (err) => onError?.(err)
      );
    } catch (e) {
      onError?.(e);
    }
  })();

  return () => typeof unsub === "function" && unsub();
}

export function subscribeState(onData, onError) {
  const ref = stateRef();
  let unsub = null;

  (async () => {
    try {
      await ensureStateDoc();
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) return onData?.(defaultState());
          const data = snap.data() || {};
          onData?.({
            shiftMap: data.shiftMap || {},
            doneMap: data.doneMap || {},
            savedAt: data.savedAt || Date.now(),
          });
        },
        (err) => onError?.(err)
      );
    } catch (e) {
      onError?.(e);
    }
  })();

  return () => typeof unsub === "function" && unsub();
}

export function subscribeAll({ onTemplate, onState, onError }) {
  const off1 = subscribeTemplate(onTemplate, onError);
  const off2 = subscribeState(onState, onError);
  return () => {
    off1?.();
    off2?.();
  };
}
