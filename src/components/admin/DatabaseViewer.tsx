import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { Database, Search, Filter } from 'lucide-react';

export function DatabaseViewer() {
  const { sqlDatabase, currentUser } = useSchool();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const queryCompiledResults = async () => {
    setLoading(true);
    setError("");
    setResults([]);
    
    try {
      if (!sqlDatabase) {
        setError("SQL Database not available");
        return;
      }

      // Query all compiled results
      const allResults = await sqlDatabase.executeQuery(
        "SELECT * FROM compiled_results ORDER BY student_id, class_id"
      );
      
      // Query parent-student links
      const parentLinks = await sqlDatabase.executeQuery(
        "SELECT * FROM parent_student_links WHERE parent_id = ?",
        [currentUser?.linked_id]
      );
      
      // Query approved results specifically
      const approvedResults = await sqlDatabase.executeQuery(
        "SELECT * FROM compiled_results WHERE status = 'Approved'"
      );
      
      // Query results for this parent's children
      if (parentLinks && parentLinks.length > 0) {
        const studentIds = parentLinks.map((link: any) => link.student_id);
        const placeholders = studentIds.map(() => '?').join(',');
        const parentResults = await sqlDatabase.executeQuery(
          `SELECT * FROM compiled_results WHERE student_id IN (${placeholders})`,
          studentIds
        );
        
        setResults(parentResults.data || []);
      } else {
        setResults([]);
      }
      
      // Set all results for display
      setResults(allResults.data || []);
      
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const queryParentStudentLinks = async () => {
    setLoading(true);
    setError("");
    
    try {
      if (!sqlDatabase) {
        setError("SQL Database not available");
        return;
      }

      const links = await sqlDatabase.executeQuery(
        "SELECT * FROM parent_student_links"
      );
      
      setResults(links.data || []);
      
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const queryStudents = async () => {
    setLoading(true);
    setError("");
    
    try {
      if (!sqlDatabase) {
        setError("SQL Database not available");
        return;
      }

      const students = await sqlDatabase.executeQuery(
        "SELECT id, firstName, lastName, admissionNumber, className FROM students LIMIT 20"
      );
      
      setResults(students.data || []);
      
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-xl font-bold">Database Viewer</h2>
          </div>
          <p className="text-gray-600">Debug database queries for approved results</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={queryCompiledResults} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Query Compiled Results
            </Button>
            <Button onClick={queryParentStudentLinks} disabled={loading} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Query Parent-Student Links
            </Button>
            <Button onClick={queryStudents} disabled={loading} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Query Students
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Querying database...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Results ({results.length})</h3>
                <Badge variant="outline">Check Console</Badge>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
