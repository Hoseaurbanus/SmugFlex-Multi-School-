import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";

import { useSchool } from "../../contexts/SchoolContext";
import { toast } from 'sonner';

interface StaffRow {
  lastName: string;
  firstName: string;
  otherName: string;
  gender: string;
  phone: string;
  username: string;
  email: string;
  role: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string; data: StaffRow }[];
}

export function BulkStaffImportPage() {
  const { addTeacher, addUser, teachers, users } = useSchool();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<StaffRow[]>([]);

  // Sample template data
  const sampleTemplateData = [
    ["Last Name", "First Name", "Other Name", "Gender", "Phone", "Username", "Email", "Role"],
    ["AHMED", "HASSANA", "SOYA", "FEMALE", "08012345678", "hassana2@gra", "hassana@example.com", "CLASS TEACHER"],
    ["CHRIS", "RHEMA", "", "FEMALE", "08087654321", "rhema1@gra", "cr@gmail.com", "CLASS TEACHER"],
  ];

  const handleDownloadTemplate = () => {
    const csvContent = sampleTemplateData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      parseCSVForPreview(selectedFile);
    }
  };

  const parseCSVForPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Skip header row and parse data
      const dataRows = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        return {
          lastName: values[0] || "",
          firstName: values[1] || "",
          otherName: values[2] || "",
          gender: values[3] || "",
          phone: values[4] || "",
          username: values[5] || "",
          email: values[6] || "",
          role: values[7] || "",
        };
      });

      setPreviewData(dataRows.slice(0, 10)); // Show first 10 for preview
      toast.success(`CSV parsed successfully. Found ${lines.length - 1} records.`);
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    return values;
  };

  const generateUniqueUsername = (firstName: string, lastName: string, existingUsernames: string[]): string => {
    const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}`;
    let username = `${baseUsername}@gra`;
    let counter = 1;

    while (existingUsernames.includes(username)) {
      username = `${baseUsername}${counter}@gra`;
      counter++;
    }

    return username;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import");
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV file is empty or invalid");
          setImporting(false);
          return;
        }

        const result: ImportResult = {
          success: 0,
          failed: 0,
          errors: [],
        };

        const existingUsernames = users.map((u: any) => u.username);
        const newUsernames: string[] = [...existingUsernames];

        // Skip header and process each row
        lines.slice(1).forEach(async (line, index) => {
          const values = parseCSVLine(line);
          const rowNum = index + 2; // +2 because we skipped header and arrays are 0-indexed

          const staffData: StaffRow = {
            lastName: values[0]?.trim() || "",
            firstName: values[1]?.trim() || "",
            otherName: values[2]?.trim() || "",
            gender: values[3]?.trim().toUpperCase() || "",
            phone: values[4]?.trim() || "",
            username: values[5]?.trim() || "",
            email: values[6]?.trim() || "",
            role: values[7]?.trim().toUpperCase() || "",
          };

          // Validate required fields
          if (!staffData.firstName || !staffData.lastName) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              error: "First name and last name are required",
              data: staffData,
            });
            return;
          }

          if (!staffData.gender || !["MALE", "FEMALE"].includes(staffData.gender)) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              error: "Invalid gender. Must be MALE or FEMALE",
              data: staffData,
            });
            return;
          }

          // Generate username if not provided or invalid
          let finalUsername = staffData.username;
          if (!finalUsername || !finalUsername.includes("@gra")) {
            finalUsername = generateUniqueUsername(staffData.firstName, staffData.lastName, newUsernames);
          }

          // Check if username already exists
          if (newUsernames.includes(finalUsername) && finalUsername === staffData.username) {
            finalUsername = generateUniqueUsername(staffData.firstName, staffData.lastName, newUsernames);
          }

          newUsernames.push(finalUsername);

          // Generate employee ID
          const employeeId = `EMP${String(teachers.length + result.success + 1).padStart(4, "0")}`;

          // Determine role and specialization
          const isClassTeacher = staffData.role.includes("CLASS TEACHER");
          const specialization = staffData.role === "MEDICAL OFFICER" 
            ? ["Health", "Medical"]
            : isClassTeacher 
            ? ["General Education"]
            : ["Subject Teaching"];

          try {
            // Create teacher record
            const teacherId = addTeacher({
              first_name: staffData.firstName,
              last_name: staffData.lastName,
              employee_id: employeeId,
              email: staffData.email || `${finalUsername}`,
              phone: staffData.phone,
              qualification: "B.Ed", // Default qualification
              specialization: specialization.join(", "),
              status: "Active",
              is_class_teacher: isClassTeacher,
            });

            // Create user account
            addUser({
              username: finalUsername,
              role: "teacher",
              linked_id: await teacherId,
              email: staffData.email || `${finalUsername}`,
              status: "Active",
            });

            result.success++;
          } catch (error: any) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              error: error.message || "Failed to create staff record",
              data: staffData,
            });
          }
        });

        setImportResult(result);
        
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} staff members!`);
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} records failed to import. Check details below.`);
        }
      } catch (error: any) {
        toast.error(`Import failed: ${error.message}`);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-[#0A2540] mb-2">Bulk Staff Import</h1>
        <p className="text-gray-600">
          Import multiple staff members at once using a CSV file
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="border-[#0A2540]/10 rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-blue-200 bg-blue-50 rounded-xl">
            <span className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Important:</strong> Please ensure your CSV file follows the correct format. Download the template below to get started.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-medium text-[#0A2540]">CSV File Format:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li><strong>Last Name</strong> - Required</li>
              <li><strong>First Name</strong> - Required</li>
              <li><strong>Other Name</strong> - Optional</li>
              <li><strong>Gender</strong> - Required (MALE or FEMALE)</li>
              <li><strong>Phone</strong> - Optional (11 digits)</li>
              <li><strong>Username</strong> - Optional (auto-generated if not provided)</li>
              <li><strong>Email</strong> - Optional</li>
              <li><strong>Role</strong> - Required (CLASS TEACHER, SUBJECT TEACHER, MEDICAL OFFICER, etc.)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-[#0A2540]">Default Values:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li><strong>Default Password:</strong> gra2024 (All imported staff will use this password)</li>
              <li><strong>Default Qualification:</strong> B.Ed</li>
              <li><strong>Status:</strong> Active</li>
              <li><strong>Username Format:</strong> firstname + last initial + @gra (e.g., hassanaa@gra)</li>
            </ul>
          </div>

          <Button
            onClick={handleDownloadTemplate}
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
          >
            <span className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card className="border-[#0A2540]/10 rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-[#0A2540] mb-2 block">Select CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="h-12 rounded-xl border-[#0A2540]/20"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {previewData.length > 0 && (
            <div>
              <h3 className="font-medium text-[#0A2540] mb-2">Preview (First 10 records)</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Gender</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          {row.lastName} {row.firstName} {row.otherName}
                        </td>
                        <td className="px-3 py-2">{row.gender}</td>
                        <td className="px-3 py-2">{row.phone || "-"}</td>
                        <td className="px-3 py-2">{row.email || "-"}</td>
                        <td className="px-3 py-2">{row.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl w-full"
          >
            {importing ? (
              <>
                <span className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Import Staff Members
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <span className="w-5 h-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h3 className="font-medium text-[#0A2540] mb-2">Error Details:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResult.errors.map((error, idx) => (
                    <Alert key={idx} className="border-red-200 bg-red-50 rounded-xl">
                      <span className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>Row {error.row}:</strong> {error.error}
                        <br />
                        <span className="text-sm">
                          Name: {error.data.firstName} {error.data.lastName}
                        </span>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {importResult.success > 0 && (
              <Alert className="border-green-200 bg-green-50 rounded-xl">
                <span className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Success!</strong> {importResult.success} staff member(s) have been imported successfully. 
                  All imported staff have been assigned the default password: <strong>gra2024</strong>. 
                  Please advise them to change their password after first login.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
