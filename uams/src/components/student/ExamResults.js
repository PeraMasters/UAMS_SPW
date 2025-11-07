import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabaseClient';

const ExamResults = ({ studentData }) => {
  const [examResults, setExamResults] = useState([]);
  const [examResultsLoading, setExamResultsLoading] = useState(false);

  // Helper function to calculate grade points
  const calculateGradePoints = (grade) => {
    if (!grade) return 0;
    
    const gradeStr = grade.toString().toUpperCase().trim();
    
    // Standard 4.0 GPA scale
    const gradeMap = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    
    return gradeMap[gradeStr] || 0;
  };

  // Helper function to get grade color
  const getGradeColor = (grade) => {
    if (!grade) return '#6c757d';
    
    const gradeStr = grade.toString().toUpperCase().trim();
    
    if (gradeStr.startsWith('A')) return '#28a745'; // Green for A grades
    if (gradeStr.startsWith('B')) return '#007bff'; // Blue for B grades  
    if (gradeStr.startsWith('C')) return '#ffc107'; // Yellow for C grades
    if (gradeStr.startsWith('D')) return '#fd7e14'; // Orange for D grades
    if (gradeStr === 'F') return '#dc3545'; // Red for F grade
    
    return '#6c757d'; // Gray for unknown grades
  };

  const fetchExamResults = useCallback(async (studentSID) => {
    try {
      console.log('Debug: Fetching exam results for student:', studentSID);
      setExamResultsLoading(true);
      
      // First, let's check if the examresult table exists and has any data
      const { data: sampleResults, error: sampleError } = await supabase
        .from('examresult')
        .select('*')
        .limit(5);
      
      console.log('Debug: Sample examresult data (first 5 records):', { sampleResults, sampleError });
      
      // Also check what SIDs exist in examresult table to verify data
      const { data: uniqueSIDs, error: sidError } = await supabase
        .from('examresult')
        .select('sid')
        .limit(10);
      
      console.log('Debug: SIDs found in examresult table:', { uniqueSIDs, sidError });
      console.log('Debug: Looking for results with SID:', studentSID);
      
      // Step 1: Get exam results for the student
      const { data: examResultsData, error: resultsError } = await supabase
        .from('examresult')
        .select('resultid, marks, grade, sid, cid')
        .eq('sid', studentSID);

      if (resultsError) {
        console.error('Exam results fetch error:', resultsError);
        setExamResults([]);
        return;
      }

      console.log('Debug: Raw exam results:', examResultsData);

      if (!examResultsData || examResultsData.length === 0) {
        console.log('Debug: No exam results found for student');
        setExamResults([]);
        return;
      }

      // Step 2: Get course details for each result
      const courseIds = [...new Set(examResultsData.map(result => result.cid))];
      console.log('Debug: Course IDs for results:', courseIds);

      const { data: coursesData, error: coursesError } = await supabase
        .from('course')
        .select('cid, cname, credits, year, semester, degreeid, type')
        .in('cid', courseIds);

      if (coursesError) {
        console.error('Error fetching course details:', coursesError);
        setExamResults(examResultsData || []);
        return;
      }

      console.log('Debug: Course details:', coursesData);

      // Step 3: Combine exam results with course details
      const resultsWithCourses = examResultsData.map(result => {
        const courseDetails = coursesData?.find(course => course.cid === result.cid);
        return {
          ...result,
          course: courseDetails || { 
            cid: result.cid, 
            cname: 'Unknown Course', 
            credits: 0, 
            year: 0, 
            semester: 0,
            type: 'Unknown'
          }
        };
      });

      console.log('Debug: Results with course details:', resultsWithCourses);

      // Step 4: Sort by year and semester
      const sortedResults = resultsWithCourses.sort((a, b) => {
        if (a.course.year !== b.course.year) {
          return a.course.year - b.course.year;
        }
        return a.course.semester - b.course.semester;
      });

      console.log('Debug: Sorted results:', sortedResults);

      // Step 5: Group by year and semester, calculate semester GPAs
      const groupedResults = {};
      sortedResults.forEach(result => {
        const key = `Year ${result.course.year} Semester ${result.course.semester}`;
        if (!groupedResults[key]) {
          groupedResults[key] = {
            year: result.course.year,
            semester: result.course.semester,
            results: [],
            totalCredits: 0,
            totalGradePoints: 0,
            semesterGPA: 0
          };
        }
        
        // Add grade points calculation
        const gradePoints = calculateGradePoints(result.grade);
        const credits = result.course.credits || 0;
        
        groupedResults[key].results.push({
          ...result,
          gradePoints,
          credits
        });
        
        if (gradePoints > 0) { // Only count if valid grade
          groupedResults[key].totalCredits += credits;
          groupedResults[key].totalGradePoints += (gradePoints * credits);
        }
      });

      // Calculate semester GPAs
      Object.keys(groupedResults).forEach(key => {
        const group = groupedResults[key];
        if (group.totalCredits > 0) {
          group.semesterGPA = (group.totalGradePoints / group.totalCredits).toFixed(2);
        } else {
          group.semesterGPA = '0.00';
        }
      });

      // Step 6: Calculate overall GPA
      let totalCreditsOverall = 0;
      let totalGradePointsOverall = 0;
      
      Object.values(groupedResults).forEach(group => {
        totalCreditsOverall += group.totalCredits;
        totalGradePointsOverall += group.totalGradePoints;
      });

      const overallGPA = totalCreditsOverall > 0 ? 
        (totalGradePointsOverall / totalCreditsOverall).toFixed(2) : '0.00';

      console.log('Debug: Grouped results with GPA:', groupedResults);
      console.log('Debug: Overall GPA:', overallGPA);

      // Store both grouped results and overall GPA
      const resultData = {
        groupedResults,
        overallGPA,
        sortedResults,
        rawResults: examResultsData // Keep raw data as fallback
      };
      
      console.log('Debug: Final exam results object:', resultData);
      setExamResults(resultData);

    } catch (error) {
      console.error('Error fetching exam results:', error);
      setExamResults([]);
    } finally {
      setExamResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentData?.sid) {
      console.log('Debug: ExamResults component - fetching fresh exam results...');
      setExamResults([]); // Clear previous results
      fetchExamResults(studentData.sid);
    }
  }, [studentData, fetchExamResults]);

  return (
    <div className="exam-results">
      <h3>📊 Academic Results</h3>
      
      {examResultsLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>🔄 Loading Exam Results...</div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Fetching your academic records and calculating GPA...
          </div>
        </div>
      ) : examResults && examResults.groupedResults && Object.keys(examResults.groupedResults).length > 0 ? (
        <div>
          {/* Overall GPA Display */}
          <div style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            🎓 Overall GPA: {examResults.overallGPA}
          </div>

          {/* Results by Semester */}
          {Object.keys(examResults.groupedResults)
            .sort((a, b) => {
              const aGroup = examResults.groupedResults[a];
              const bGroup = examResults.groupedResults[b];
              if (aGroup.year !== bGroup.year) {
                return aGroup.year - bGroup.year;
              }
              return aGroup.semester - bGroup.semester;
            })
            .map((semesterKey) => {
              const semesterData = examResults.groupedResults[semesterKey];
              return (
                <div key={semesterKey} style={{ marginBottom: '40px' }}>
                  {/* Semester Header with GPA */}
                  <div style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '15px 20px',
                    borderRadius: '8px 8px 0 0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>📚 {semesterKey}</span>
                    <span>Semester GPA: {semesterData.semesterGPA}</span>
                  </div>

                  {/* Results Table for this semester */}
                  <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderTop: 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', color: '#333' }}>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Course Code</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Course Name</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Credits</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Type</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Marks</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Grade</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Grade Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semesterData.results.map((result, index) => (
                          <tr key={result.resultid || index} style={{ 
                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                            transition: 'background-color 0.2s'
                          }}>
                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                              {result.course.cid}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              {result.course.cname}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              {result.course.credits}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: result.course.type === 'core' ? '#007bff' : '#6c757d',
                                color: 'white'
                              }}>
                                {result.course.type?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                              {result.marks}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <span style={{ 
                                fontWeight: 'bold', 
                                padding: '6px 10px',
                                borderRadius: '4px',
                                backgroundColor: getGradeColor(result.grade),
                                color: 'white'
                              }}>
                                {result.grade}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                              {result.gradePoints?.toFixed(1) || '0.0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Semester Summary */}
                  <div style={{
                    backgroundColor: '#e9ecef',
                    padding: '15px 20px',
                    borderRadius: '0 0 8px 8px',
                    border: '1px solid #ddd',
                    borderTop: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    <span>📈 Total Credits: {semesterData.totalCredits}</span>
                    <span>🎯 Grade Points: {semesterData.totalGradePoints.toFixed(2)}</span>
                    <span>📊 Semester GPA: {semesterData.semesterGPA}</span>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          <h4>📋 No Exam Results Found</h4>
          <p>Your academic results will appear here once they are available.</p>
        </div>
      )}
    </div>
  );
};

export default ExamResults;

