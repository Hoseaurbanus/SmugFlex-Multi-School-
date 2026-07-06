import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

// Legacy staff data for import
const LEGACY_STAFF_DATA = [
  { lastName: "AHMED", firstName: "HASSANA", otherName: "SOYA", gender: "FEMALE", phone: "", username: "hassana2@gra", email: "", role: "CLASS TEACHER" },
  { lastName: "CHRIS", firstName: "RHEMA", otherName: "", gender: "FEMALE", phone: "", username: "rhema1@gra", email: "cr@gmail.com", role: "CLASS TEACHER" },
  { lastName: "Dike", firstName: "Stella", otherName: "Onyeka", gender: "FEMALE", phone: "8068651255", username: "stella1@gra", email: "kachidike4@gmail.com", role: "MEDICAL OFFICER" },
  { lastName: "DIMAS", firstName: "AFODIA", otherName: "", gender: "FEMALE", phone: "8114700334", username: "afodia1@gra", email: "dimasafodia@gmail.com", role: "CLASS TEACHER" },
  { lastName: "DONALD", firstName: "DESMOND", otherName: "", gender: "MALE", phone: "", username: "desmond2@gra", email: "dd@gmaill.com", role: "SUBJECT TEACHER" },
  { lastName: "GAYUS", firstName: "RUTH", otherName: "", gender: "FEMALE", phone: "8139935554", username: "ruth3@gra", email: "ruthgayus1092@gmail.com", role: "CLASS TEACHER" },
  { lastName: "HABILA", firstName: "SUZAN", otherName: "SADAH", gender: "FEMALE", phone: "8146283749", username: "suzan4@gra", email: "habilasuzan5@gmail.com", role: "CLASS TEACHER" },
  { lastName: "ISHAYA", firstName: "RAHAB", otherName: "", gender: "FEMALE", phone: "8133183072", username: "rahab1@gra", email: "rahagodiyaishaya@gmail.com", role: "CLASS TEACHER" },
  { lastName: "KUDI", firstName: "RAPTURE", otherName: "", gender: "FEMALE", phone: "8107197847", username: "rapture1@gra", email: "rapture@gmail.com", role: "CLASS TEACHER" },
  { lastName: "LUCKY", firstName: "OMOLARA", otherName: "", gender: "FEMALE", phone: "8063147667", username: "omolara1@gra", email: "osanyingbemiomolara@gmail.com", role: "CLASS TEACHER" },
  { lastName: "MAINA", firstName: "MARKUS", otherName: "WAYAS", gender: "MALE", phone: "7061575194", username: "markus1@gra", email: "makozzzz8@gmail.com", role: "CLASS TEACHER" },
  { lastName: "OROGUN", firstName: "GLORY EJIRO", otherName: "", gender: "FEMALE", phone: "7017575614", username: "gloryejiro1@gra", email: "gloryorogun94@gmail.com", role: "CLASS TEACHER" },
  { lastName: "SAIDU", firstName: "SHEBA", otherName: "YOLA", gender: "FEMALE", phone: "7048530493", username: "sheba1@gra", email: "shebayola@gmail.com", role: "SUBJECT TEACHER" },
  { lastName: "SOLOMON", firstName: "PIPDOK", otherName: "KWARSON", gender: "MALE", phone: "7037573891", username: "pipdok1@gra", email: "solomonpipdok@gmail.com", role: "SUBJECT TEACHER" },
  { lastName: "TALI", firstName: "HAUYIRAH", otherName: "", gender: "MALE", phone: "8167175146", username: "hauyirah1@gra", email: "hauyirahtali@gmail.com", role: "SUBJECT TEACHER" },
  { lastName: "YUNUSA", firstName: "YOHANNA", otherName: "", gender: "MALE", phone: "", username: "yohanna2@gra", email: "", role: "SUBJECT TEACHER" },
  { lastName: "YUNUSA", firstName: "NORA", otherName: "", gender: "FEMALE", phone: "7032808483", username: "nora1@gra", email: "yunusanora32@gmail.com", role: "CLASS TEACHER" },
];

export function QuickStaffImportPage() {
  const { addTeacher, teachers, users } = useSchool();
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, skipped: 0 });

  const handleQuickImport = async () => {
    if (!confirm(`This will import ${LEGACY_STAFF_DATA.length} staff members. Continue?`)) {
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;
    let skipped = 0;

    const existingUsernames = users.map((u: any) => u.username);

    for (const staff of LEGACY_STAFF_DATA) {
      try {
        // Check if username already exists
        if (existingUsernames.includes(staff.username)) {
          skipped++;
          continue;
        }

        // Generate employee ID
        const employeeId = `EMP${String(teachers.length + success + 1).padStart(4, "0")}`;

        // Determine role and specialization
        const isClassTeacher = staff.role.includes("CLASS TEACHER");
        const specialization = staff.role === "MEDICAL OFFICER" 
          ? ["Health", "Medical"]
          : isClassTeacher 
          ? ["General Education"]
          : ["Subject Teaching"];

        // Create teacher record
        const teacherId = await addTeacher({
          firstName: staff.firstName,
          lastName: staff.lastName,
          employeeId: employeeId,
          email: staff.email || `${staff.username}`,
          phone: staff.phone,
          department: staff.role.includes("MEDICAL") ? "Medical" : "General",
          status: "Active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        existingUsernames.push(staff.username);
        success++;
      } catch (error: any) {
        failed++;
      }
    }

    setImportResults({ success, failed, skipped });
    setImporting(false);
    setImportComplete(true);

    if (success > 0) {
      toast.success(`Successfully imported ${success} staff members!`);
    }
    if (failed > 0) {
      toast.error(`${failed} staff members failed to import`);
    }
    if (skipped > 0) {
      toast.warning(`${skipped} staff members were skipped (already exist)`);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = [
      ["Last Name", "First Name", "Other Name", "Gender", "Phone", "Username", "Email", "Role"],
      ...LEGACY_STAFF_DATA.map(staff => [
        staff.lastName,
        staff.firstName,
        staff.otherName,
        staff.gender,
        staff.phone,
        staff.username,
        staff.email,
        staff.role
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legacy_staff_data.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded successfully");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-[#0A2540] mb-2">Quick Staff Import</h1>
        <p className="text-gray-600">
          Import all 17 legacy staff members with one click
        </p>
      </div>

      {/* Staff Preview Card */}
      <Card className="border-[#0A2540]/10 rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5" />
            Staff Members to Import ({LEGACY_STAFF_DATA.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Last Name</th>
                  <th className="px-3 py-2 text-left">First Name</th>
                  <th className="px-3 py-2 text-left">Other Name</th>
                  <th className="px-3 py-2 text-left">Gender</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Username</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {LEGACY_STAFF_DATA.map((staff, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{staff.lastName}</td>
                    <td className="px-3 py-2">{staff.firstName}</td>
                    <td className="px-3 py-2">{staff.otherName || "-"}</td>
                    <td className="px-3 py-2">
                      <Badge className={staff.gender === "FEMALE" ? "bg-pink-100 text-pink-800" : "bg-blue-100 text-blue-800"}>
                        {staff.gender}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{staff.phone || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{staff.username}</td>
                    <td className="px-3 py-2 text-xs">{staff.email || "-"}</td>
                    <td className="px-3 py-2">
                      <Badge className={staff.role.includes("CLASS") ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                        {staff.role}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Import Information */}
      <Card className="border-[#0A2540]/10 rounded-xl">
        <CardHeader className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5" />
            Import Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-blue-200 bg-blue-50 rounded-xl">
            <span className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Default Settings:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All staff will be assigned the default password: <strong>gra2024</strong></li>
                <li>All staff will be created with <strong>Active</strong> status</li>
                <li>Default qualification: <strong>B.Ed</strong></li>
                <li>Usernames will be imported as provided (e.g., hassana2@gra)</li>
                <li>Staff with existing usernames will be skipped</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-900 font-medium mb-1">Class Teachers</p>
              <p className="text-2xl font-bold text-green-600">
                {LEGACY_STAFF_DATA.filter(s => s.role.includes("CLASS")).length}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-blue-900 font-medium mb-1">Subject Teachers</p>
              <p className="text-2xl font-bold text-blue-600">
                {LEGACY_STAFF_DATA.filter(s => s.role.includes("SUBJECT")).length}
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-purple-900 font-medium mb-1">Medical Officer</p>
              <p className="text-2xl font-bold text-purple-600">
                {LEGACY_STAFF_DATA.filter(s => s.role.includes("MEDICAL")).length}
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-orange-900 font-medium mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-orange-600">
                {LEGACY_STAFF_DATA.length}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleQuickImport}
              disabled={importing || importComplete}
              className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl h-12"
            >
              {importing ? (
                <>
                  <Plus className="w-5 h-5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : importComplete ? (
                <>
                  <span className="w-5 h-5 mr-2" />
                  Import Complete
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Import All {LEGACY_STAFF_DATA.length} Staff Members
                </>
              )}
            </Button>

            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              className="rounded-xl border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
            >
              <span className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importComplete && (
        <Card className="border-[#0A2540]/10 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <span className="w-5 h-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Skipped</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{importResults.skipped}</p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
              </div>
            </div>

            {importResults.success > 0 && (
              <Alert className="border-green-200 bg-green-50 rounded-xl mt-4">
                <span className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Success!</strong> {importResults.success} staff member(s) have been imported successfully. 
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
