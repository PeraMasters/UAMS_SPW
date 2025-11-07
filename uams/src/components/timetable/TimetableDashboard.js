import React, { useMemo, useState } from "react";
import "./timetable.css";

import HeaderBar from "./Shared/HeaderBar";
import SideNav from "./Shared/SideNav";

import OverviewPage from "./Overview/OverviewPage";
import ExamManagement from "./Exams/ExamManagement";
import RoomManagement from "./Rooms/RoomManagement";
import Reportdashboard from "./Reports/Reportdashboard";

export default function TimetableDashboard() {
  // tabs: overview | exams | rooms | reports
  const [tab, setTab] = useState("overview");

  const title = useMemo(() => "Timetable Management", []);
  const subtitle = useMemo(
    () => "Manage lectures, exams, rooms and analytics",
    []
  );

  // Right-side header action:
  // - overview: "+ Schedule Event"
  // - exams:    no button (removed as requested)
  // - rooms:    "+ Add Room"
  const actionSlot =
    tab === "overview" ? (
      <button
        className="tt-btn tt-btn-primary"
        onClick={() => document.dispatchEvent(new Event("openScheduleEvent"))}
      >
        + Schedule Event
      </button>
    ) : tab === "rooms" ? (
      <button
        className="tt-btn tt-btn-primary"
        onClick={() => document.dispatchEvent(new Event("tt.openAddRoomModal"))}
      >
        + Add Room
      </button>
    ) : null; // exams/reports: no action

  return (
    <div className="tt-root">
      <HeaderBar title={title} subtitle={subtitle} actionSlot={actionSlot} />

      <div className="tt-layout">
        {/* Left sidebar controls tab switching */}
        <aside className="tt-sidenav">
          <SideNav activeKey={tab} onChange={setTab} />
        </aside>

        {/* Main content (no top tabs) */}
        <main className="tt-main">
          <div className="tt-page">
            {tab === "overview" && <OverviewPage />}
            {tab === "exams" && <ExamManagement />}
            {tab === "rooms" && <RoomManagement />}
            {tab === "reports" && <Reportdashboard />}
          </div>
        </main>
      </div>
    </div>
  );
}
