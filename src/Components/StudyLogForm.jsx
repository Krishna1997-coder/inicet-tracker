import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ExamList() {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data, error } = await supabase.from("exams").select("*");
    if (error) console.error(error);
    else setExams(data);
  };

  return (
    <div>
      <h2>Saved Exams</h2>
      {exams.length === 0 ? (
        <p>No exams added yet.</p>
      ) : (
        <ul>
          {exams.map((exam) => (
            <li key={exam.id}>
              {exam.subject} — {exam.score}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
