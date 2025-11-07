import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../lib/supabaseClient';

const EnrolledModules = ({ studentData }) => {
  const [enrolledModules, setEnrolledModules] = useState({
    semester: [],
    prorata: [],
    repeat: []
  });

  // Fetch enrolled modules data
  const fetchEnrolledModules = useCallback(async () => {
    if (!studentData?.sid) return;

    try {
      // Fetch semester modules from semester_payment with completed status
      const { data: semesterData, error: semesterError } = await supabase
        .from('semester_payment')
        .select(`
          paymentid,
          year,
          semester,
          status,
          date,
          degreeid,
          degree:degreeid (
            degreeid,
            dname
          )
        `)
        .eq('sid', studentData.sid)
        .eq('status', 'Completed')
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      // For each semester enrollment, fetch the courses for that year/semester/degree
      let enrichedSemesterData = [];
      if (semesterData && semesterData.length > 0) {
        enrichedSemesterData = await Promise.all(
          semesterData.map(async (semesterModule) => {
            // Fetch courses for this specific year, semester, and degree
            const { data: coursesData, error: coursesError } = await supabase
              .from('course')
              .select(`
                cid,
                cname,
                credits,
                year,
                semester,
                type
              `)
              .eq('year', semesterModule.year)
              .eq('semester', semesterModule.semester)
              .eq('degreeid', semesterModule.degreeid)
              .order('cid');

            if (coursesError) {
              console.error('Error fetching courses for semester:', coursesError);
              return { ...semesterModule, courses: [] };
            }

            return { ...semesterModule, courses: coursesData || [] };
          })
        );
      }

      // Fetch prorata and repeat modules from other_payment with completed status
      const { data: otherData, error: otherError } = await supabase
        .from('other_payment')
        .select(`
          paymentid,
          sid,
          year,
          semester,
          amount,
          paymenttype,
          status,
          date,
          cid,
          attachment,
          course:cid (
            cid,
            cname,
            credits,
            type
          )
        `)
        .eq('sid', studentData.sid)
        .eq('status', 'Completed')
        .order('date', { ascending: false });

      if (semesterError) {
        console.error('Error fetching semester modules:', semesterError);
      }

      if (otherError) {
        console.error('Error fetching other modules:', otherError);
      }

      // Group other modules by payment type
      const prorataModules = otherData?.filter(item => item.paymenttype === 'Prorata') || [];
      const repeatModules = otherData?.filter(item => item.paymenttype === 'Repeat Module') || [];

      setEnrolledModules({
        semester: enrichedSemesterData || [],
        prorata: prorataModules,
        repeat: repeatModules
      });

    } catch (error) {
      console.error('Error fetching enrolled modules:', error);
    }
  }, [studentData?.sid]);

  useEffect(() => {
    if (studentData?.sid) {
      fetchEnrolledModules();
    }
  }, [studentData, fetchEnrolledModules]);

  return (
    <div className="enrolled-modules">
      <h3>📚 Enrolled Modules</h3>
      
      {/* Semester Modules */}
      <div style={{ marginBottom: '40px' }}>
        <h4 style={{ color: '#007bff', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
          📅 Semester Modules
        </h4>
        {enrolledModules.semester.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {enrolledModules.semester.map((semesterModule, index) => (
              <div key={semesterModule.paymentid} style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h5 style={{ color: '#007bff', margin: 0 }}>
                    Year {semesterModule.year} - Semester {semesterModule.semester}
                  </h5>
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {semesterModule.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  <div><strong>Degree:</strong> {semesterModule.degree?.dname || 'N/A'}</div>
                  <div><strong>Enrollment Date:</strong> {new Date(semesterModule.date).toLocaleDateString()}</div>
                  <div><strong>Payment ID:</strong> {semesterModule.paymentid}</div>
                </div>
                
                {/* Courses List */}
                <div>
                  <h6 style={{ color: '#495057', marginBottom: '10px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                    📚 Courses ({semesterModule.courses?.length || 0})
                  </h6>
                  {semesterModule.courses && semesterModule.courses.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {semesterModule.courses.map((course, courseIndex) => (
                        <div key={course.cid} style={{
                          backgroundColor: 'white',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '14px' }}>
                              {course.cid} - {course.cname}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                              {course.credits} Credits • {course.type}
                            </div>
                          </div>
                          <div style={{
                            padding: '3px 8px',
                            backgroundColor: course.type === 'Core' ? '#28a745' : '#ffc107',
                            color: course.type === 'Core' ? 'white' : '#212529',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {course.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#6c757d', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
                      No courses found for this semester
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No completed semester enrollments found.</p>
        )}
      </div>

      {/* Prorata Modules */}
      <div style={{ marginBottom: '40px' }}>
        <h4 style={{ color: '#17a2b8', marginBottom: '20px', borderBottom: '2px solid #17a2b8', paddingBottom: '5px' }}>
          📋 Prorata Modules
        </h4>
        {enrolledModules.prorata.length > 0 ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            {enrolledModules.prorata.map((prorataModule, index) => (
              <div key={prorataModule.paymentid} style={{
                backgroundColor: '#e7f6fd',
                border: '1px solid #bee5eb',
                borderRadius: '8px',
                padding: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h6 style={{ color: '#17a2b8', margin: 0 }}>
                    {prorataModule.course?.cid} - {prorataModule.course?.cname}
                  </h6>
                  <span style={{
                    padding: '3px 8px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    Prorata
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Credits:</strong> {prorataModule.course?.credits || 'N/A'}</div>
                  <div><strong>Type:</strong> {prorataModule.course?.type || 'N/A'}</div>
                  <div><strong>Year:</strong> {prorataModule.year}</div>
                  <div><strong>Semester:</strong> {prorataModule.semester}</div>
                  <div><strong>Amount:</strong> LKR {prorataModule.amount || 'N/A'}</div>
                  <div><strong>Date:</strong> {new Date(prorataModule.date).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No completed prorata modules found.</p>
        )}
      </div>

      {/* Repeat Modules */}
      <div style={{ marginBottom: '40px' }}>
        <h4 style={{ color: '#dc3545', marginBottom: '20px', borderBottom: '2px solid #dc3545', paddingBottom: '5px' }}>
          🔄 Repeat Modules
        </h4>
        {enrolledModules.repeat.length > 0 ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            {enrolledModules.repeat.map((repeatModule, index) => (
              <div key={repeatModule.paymentid} style={{
                backgroundColor: '#fdf2f2',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                padding: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h6 style={{ color: '#dc3545', margin: 0 }}>
                    {repeatModule.course?.cid} - {repeatModule.course?.cname}
                  </h6>
                  <span style={{
                    padding: '3px 8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    Repeat
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Credits:</strong> {repeatModule.course?.credits || 'N/A'}</div>
                  <div><strong>Type:</strong> {repeatModule.course?.type || 'N/A'}</div>
                  <div><strong>Year:</strong> {repeatModule.year}</div>
                  <div><strong>Semester:</strong> {repeatModule.semester}</div>
                  <div><strong>Amount:</strong> LKR {repeatModule.amount || 'N/A'}</div>
                  <div><strong>Date:</strong> {new Date(repeatModule.date).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No completed repeat modules found.</p>
        )}
      </div>
    </div>
  );
};

export default EnrolledModules;

