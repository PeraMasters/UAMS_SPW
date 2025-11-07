// src/components/timetable/Exams/ExamManagement.js
import React, { useEffect, useState, useCallback } from "react";
import ExamStatsCards from "./ExamstatsCards";
import ExamFilters from "./ExamFilters";
import ExamTable from "./ExamTable";

import {
  fetchExams,
  updateExamStatus,
  countTotalExams,
  countUpcomingExams,
  countCompletedExams,
  countPostponedExams,
} from "../utils/supabaseFetch";

/**
 * ExamManagement (Exam tab only)
 * - No "+ Schedule Exam" button or modal on this page.
 * - KPI cards are GLOBAL snapshot counts (unfiltered).
 * - Filters (Type/Category/Status) apply ONLY to the table; click "View".
 * - Row Action dropdown updates Status in DB and refreshes KPIs.
 */
export default function ExamManagement() {
  // KPI snapshot
  const [kpis, setKpis] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    postponed: 0,
  });

  // Table filters
  const [filters, setFilters] = useState({
    type: "All",      // Proper | Repeat | All
    category: "All",  // Mid | Practical | Final | All
    status: "All",    // Scheduled | Completed | Postponed | Cancelled | All
  });

  // Table data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load KPI cards (global snapshot)
  const loadKpis = useCallback(async () => {
    const [total, upcoming, completed, postponed] = await Promise.all([
      countTotalExams(),
      countUpcomingExams(),
      countCompletedExams(),
      countPostponedExams(),
    ]);
    setKpis({ total, upcoming, completed, postponed });
  }, []);

  // Load table by filters
  const loadTable = useCallback(
    async (opts = filters) => {
      setLoading(true);
      try {
        const list = await fetchExams({
          exam_type: opts.type,
          exam_category: opts.category,
          status: opts.status,
        });
        setRows(list);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Initial mount
  useEffect(() => {
    loadKpis();
    loadTable();
  }, [loadKpis, loadTable]);

  // Filter handlers
  const handleFilterChange = (partial) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const handleView = () => loadTable(filters);

  // Row action: update status
  const handleChangeStatus = async (examId, newStatus) => {
    await updateExamStatus(examId, newStatus);
    // update local row immediately
    setRows((prev) =>
      prev.map((r) => (r.id === examId ? { ...r, status: newStatus } : r))
    );
    // refresh KPIs
    loadKpis();
  };

  return (
    <>
      {/* KPI cards */}
      <ExamStatsCards stats={kpis} />

      {/* Filters (table only) */}
      <ExamFilters
        values={filters}
        onChange={handleFilterChange}
        onView={handleView}
      />

      {/* Table */}
      <ExamTable
        loading={loading}
        rows={rows}
        onChangeStatus={handleChangeStatus}
      />
    </>
  );
}
