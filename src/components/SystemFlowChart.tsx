import { Settings, LogIn, BarChart, Clipboard, ClipboardList, School, Book, BookOpen, GraduationCap, ChevronRight, ArrowLeft, Plus, Unlock, Maximize2, Minimize2 } from 'lucide-react';
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface FlowNode {
  id: string;
  title: string;
  description?: string;
  children?: FlowNode[];
  actions?: string[];
  status?: 'active' | 'locked' | 'pending' | 'approved';
  icon?: React.ReactNode;
}

interface RoleFlow {
  role: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  flows: FlowNode[];
}

export function SystemFlowChart() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getAllNodeIds = (flows: FlowNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (node: FlowNode) => {
      ids.push(node.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    flows.forEach(traverse);
    return ids;
  };

  const expandAll = () => {
    const allIds = roleFlows.flatMap(flow => getAllNodeIds(flow.flows));
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const roleFlows: RoleFlow[] = [
    {
      role: 'Admin',
      color: '#0A2540',
      bgColor: '#E8F0FE',
      icon: <span className="w-5 h-5" />,
      flows: [
        {
          id: 'admin-student',
          title: 'Student Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'admin-student-add',
              title: 'Add Student',
              actions: [
                'Open Registration Form',
                'Input Student Details',
                'Upload Photo',
                'Add Health Information',
                'Link Parent (Optional)',
                'Save → Confirmation Message'
              ]
            },
            {
              id: 'admin-student-view',
              title: 'View/Edit Student',
              actions: [
                'Search Student',
                'View Profile',
                'Edit Details',
                'Update Health Records',
                'Save Changes → Success Message'
              ]
            },
            {
              id: 'admin-student-link',
              title: 'Link Parent to Student',
              actions: [
                'Select Student',
                'Choose Parent Account',
                'Confirm Linking',
                'Send Notification to Parent'
              ]
            }
          ]
        },
        {
          id: 'admin-staff',
          title: 'Staff Management',
          icon: <Plus className="w-4 h-4" />,
          children: [
            {
              id: 'admin-staff-add',
              title: 'Add Staff',
              actions: [
                'Select Role (Teacher/Accountant)',
                'Input Staff Details',
                'Set Credentials',
                'Save → Send Welcome Email'
              ]
            },
            {
              id: 'admin-staff-assign',
              title: 'Assign Class/Subject',
              actions: [
                'Choose Teacher',
                'Select Class or Subject',
                'Confirm Assignment',
                'Notify Teacher'
              ]
            },
            {
              id: 'admin-staff-reset',
              title: 'Reset Password',
              actions: [
                'Select User',
                'Generate Temporary Password',
                'Send via Email',
                'Log Activity'
              ]
            }
          ]
        },
        {
          id: 'admin-class',
          title: 'Class & Subject Management',
          icon: <BookOpen className="w-4 h-4" />,
          children: [
            {
              id: 'admin-class-create',
              title: 'Create Class',
              actions: [
                'Add Class Name',
                'Create Sections',
                'Assign Class Teacher',
                'Set Capacity',
                'Save'
              ]
            },
            {
              id: 'admin-subject-add',
              title: 'Add Subject',
              actions: [
                'Enter Subject Name',
                'Assign to Classes',
                'Assign Subject Teacher',
                'Save'
              ]
            }
          ]
        },
        {
          id: 'admin-session',
          title: 'Session & Term Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'admin-session-add',
              title: 'Add Session',
              actions: [
                'Set Academic Year',
                'Define Start/End Dates',
                'Save'
              ]
            },
            {
              id: 'admin-term-activate',
              title: 'Activate Term',
              status: 'active',
              actions: [
                'Select Term',
                'Activate',
                'Notify All Users'
              ]
            },
            {
              id: 'admin-term-archive',
              title: 'Archive Term',
              status: 'locked',
              actions: [
                'Close Term',
                'Auto-Lock All Results',
                'Generate Reports',
                'Archive Data'
              ]
            }
          ]
        },
        {
          id: 'admin-results',
          title: 'Result Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'admin-results-review',
              title: 'Review Submitted Results',
              status: 'pending',
              actions: [
                'View Pending Results',
                'Check for Errors',
                'Approve → Notify Teacher',
                'Return for Correction → Add Comments'
              ]
            },
            {
              id: 'admin-results-generate',
              title: 'Generate Reports',
              status: 'approved',
              actions: [
                'Select Class/Student',
                'Generate Report Card',
                'Print/Export as PDF',
                'Publish to Parents'
              ]
            }
          ]
        },
        {
          id: 'admin-notifications',
          title: 'Notification System',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'admin-notif-send',
              title: 'Send Announcement',
              actions: [
                'Compose Message',
                'Select Audience (Teachers/Parents/All)',
                'Schedule or Send Now',
                'Confirm Delivery'
              ]
            },
            {
              id: 'admin-notif-view',
              title: 'View Notifications',
              actions: [
                'See All Notifications',
                'Mark as Read',
                'Delete Old Notifications'
              ]
            }
          ]
        },
        {
          id: 'admin-reports',
          title: 'Reports & Analytics',
          icon: <BarChart className="w-4 h-4" />,
          children: [
            {
              id: 'admin-analytics',
              title: 'Performance Analytics',
              actions: [
                'View Overall Statistics',
                'Filter by Term/Class',
                'Export Data',
                'Download Charts'
              ]
            },
            {
              id: 'admin-logs',
              title: 'Activity Logs',
              actions: [
                'View Teacher Activity',
                'Track System Changes',
                'Download Logs',
                'Print Reports'
              ]
            }
          ]
        },
        {
          id: 'admin-settings',
          title: 'System Settings',
          icon: <Settings className="w-4 h-4" />,
          children: [
            {
              id: 'admin-users',
              title: 'User Management',
              actions: [
                'Add New Admin',
                'Define Role Levels',
                'Set Permissions',
                'Save'
              ]
            },
            {
              id: 'admin-backup',
              title: 'Data Backup',
              actions: [
                'Backup Database',
                'Confirm Action',
                'Download Backup File',
                'System Restore (with Warning)'
              ]
            }
          ]
        }
      ]
    },
    {
      role: 'Accountant',
      color: '#059669',
      bgColor: '#D1FAE5',
      icon: <span className="w-5 h-5" />,
      flows: [
        {
          id: 'acc-fee',
          title: 'Fee Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'acc-fee-set',
              title: 'Set Fee per Class',
              actions: [
                'Select Class',
                'Input Fee Amount',
                'Set Payment Deadline',
                'Save → Auto Apply to Students'
              ]
            },
            {
              id: 'acc-fee-view',
              title: 'View Fee Setup',
              actions: [
                'See All Fee Structures',
                'Edit Amounts',
                'Archive Old Fees',
                'Print Fee Schedule'
              ]
            }
          ]
        },
        {
          id: 'acc-payment',
          title: 'Payment Handling',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'acc-payment-record',
              title: 'Record Payment',
              actions: [
                'Search Student',
                'Input Amount Paid',
                'Select Payment Method',
                'Generate Receipt',
                'Update Balance → Notify Parent'
              ]
            },
            {
              id: 'acc-payment-history',
              title: 'View Payment History',
              actions: [
                'Filter by Term/Class',
                'View Transaction Details',
                'Export Report',
                'Print Statement'
              ]
            },
            {
              id: 'acc-payment-method',
              title: 'Add Payment Method',
              actions: [
                'Select Type (Bank/Cash/Transfer)',
                'Input Details',
                'Save'
              ]
            }
          ]
        },
        {
          id: 'acc-account',
          title: 'Account Setup',
          icon: <Settings className="w-4 h-4" />,
          children: [
            {
              id: 'acc-account-add',
              title: 'Add School Account',
              actions: [
                'Input Bank Name',
                'Enter Account Number',
                'Add Account Name',
                'Save'
              ]
            }
          ]
        },
        {
          id: 'acc-reports',
          title: 'Financial Reports',
          icon: <BarChart className="w-4 h-4" />,
          children: [
            {
              id: 'acc-report-generate',
              title: 'Generate Payment Report',
              actions: [
                'Select Date Range',
                'Filter by Class',
                'Generate Report',
                'Print/Export'
              ]
            },
            {
              id: 'acc-report-defaulters',
              title: 'View Fee Defaulters',
              actions: [
                'See Outstanding Balances',
                'Send Reminder to Parents',
                'Generate Defaulter List',
                'Print Report'
              ]
            }
          ]
        }
      ]
    },
    {
      role: 'Teacher',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: <GraduationCap className="w-5 h-5" />,
      flows: [
        {
          id: 'teacher-class',
          title: 'Class Teacher Flow',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'teacher-class-view',
              title: 'View Assigned Class',
              actions: [
                'Open Class Dashboard',
                'See Student List',
                'View Class Summary'
              ]
            },
            {
              id: 'teacher-class-scores',
              title: 'Input CA & Exam Scores',
              status: 'active',
              actions: [
                'Select Subject',
                'Enter CA Scores',
                'Enter Exam Scores',
                'Auto-Save',
                'View Totals'
              ]
            },
            {
              id: 'teacher-class-traits',
              title: 'Fill Affective & Psychomotor',
              actions: [
                'Rate Each Student',
                'Add Comments',
                'Save Traits'
              ]
            },
            {
              id: 'teacher-class-submit',
              title: 'Submit Results',
              status: 'pending',
              actions: [
                'Generate Preview',
                'Review All Scores',
                'Submit to Admin',
                'Lock After Submission'
              ]
            },
            {
              id: 'teacher-class-feedback',
              title: 'View Admin Feedback',
              actions: [
                'Check Approval Status',
                'Read Comments',
                'Make Corrections if Needed',
                'Resubmit'
              ]
            }
          ]
        },
        {
          id: 'teacher-subject',
          title: 'Subject Teacher Flow',
          icon: <BookOpen className="w-4 h-4" />,
          children: [
            {
              id: 'teacher-subject-view',
              title: 'View Assigned Subjects',
              actions: [
                'See All Classes',
                'Select Class',
                'View Student List'
              ]
            },
            {
              id: 'teacher-subject-scores',
              title: 'Input Subject Scores',
              actions: [
                'Enter CA Scores',
                'Enter Exam Scores',
                'Submit to Class Teacher',
                'View Submission Status'
              ]
            },
            {
              id: 'teacher-subject-summary',
              title: 'View Class Summary',
              actions: [
                'See Averages',
                'Check Highest/Lowest',
                'Export Data'
              ]
            }
          ]
        }
      ]
    },
    {
      role: 'Parent',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      icon: <span className="w-5 h-5" />,
      flows: [
        {
          id: 'parent-children',
          title: 'Children Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'parent-children-view',
              title: 'View Linked Children',
              actions: [
                'See All Children',
                'Select Child',
                'View Profile',
                'Check Details'
              ]
            }
          ]
        },
        {
          id: 'parent-results',
          title: 'Academic Results',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'parent-results-check',
              title: 'Check Results',
              status: 'approved',
              actions: [
                'Select Child',
                'View Term Results',
                'See Subject Breakdown',
                'Download Report Card',
                'Print Result'
              ]
            }
          ]
        },
        {
          id: 'parent-fees',
          title: 'Fee Management',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'parent-fees-view',
              title: 'View Fee Status',
              actions: [
                'Check Balance',
                'View Payment History',
                'See Outstanding Amount',
                'Download Receipt'
              ]
            },
            {
              id: 'parent-fees-pay',
              title: 'Make Payment',
              actions: [
                'Select Child',
                'Enter Amount',
                'Choose Payment Method',
                'Confirm Payment',
                'Auto Update Balance',
                'Receive Receipt'
              ]
            }
          ]
        },
        {
          id: 'parent-notifications',
          title: 'Notifications',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'parent-notif-view',
              title: 'View Notifications',
              actions: [
                'See All Messages',
                'Filter by Date',
                'Mark as Read',
                'Delete Notifications'
              ]
            }
          ]
        },
        {
          id: 'parent-contact',
          title: 'Contact School',
          icon: <span className="w-4 h-4" />,
          children: [
            {
              id: 'parent-contact-send',
              title: 'Send Message',
              actions: [
                'Select Recipient',
                'Compose Message',
                'Send',
                'Track Response'
              ]
            },
            {
              id: 'parent-contact-complaint',
              title: 'Submit Complaint',
              actions: [
                'Fill Complaint Form',
                'Attach Documents',
                'Submit',
                'Receive Ticket Number'
              ]
            }
          ]
        }
      ]
    }
  ];

  const renderNode = (node: FlowNode, depth: number = 0, roleColor: string) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="mb-3" style={{ marginLeft: `${depth * 24}px` }}>
        <div
          className="flex items-start gap-2 p-3 rounded-xl border border-white/10 bg-[#0F243E] hover:shadow-lg transition-all cursor-pointer group hover:border-white/20"
          onClick={() => hasChildren && toggleNode(node.id)}
          style={{ borderLeftWidth: '4px', borderLeftColor: roleColor }}
        >
          <div className="mt-0.5">
            {hasChildren ? (
              isExpanded ? (
                <span className="w-4 h-4 text-[#C0C8D3]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#C0C8D3]" />
              )
            ) : (
              <div className="w-4 h-4 rounded-full bg-[#132C4A]" />
            )}
          </div>

          {node.icon && (
            <div className="mt-0.5" style={{ color: roleColor }}>
              {node.icon}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white">{node.title}</span>
              {node.status && (
                <Badge
                  className={`text-xs border-0 ${
                    node.status === 'active' ? 'bg-[#28A745] text-white' :
                    node.status === 'locked' ? 'bg-[#DC3545] text-white' :
                    node.status === 'approved' ? 'bg-[#1E90FF] text-white' :
                    'bg-[#FFC107] text-white'
                  }`}
                >
                  {node.status === 'active' && <Unlock className="w-3 h-3 mr-1" />}
                  {node.status === 'locked' && <span className="w-3 h-3 mr-1" />}
                  {node.status === 'approved' && <span className="w-3 h-3 mr-1" />}
                  {node.status === 'pending' && <span className="w-3 h-3 mr-1" />}
                  {node.status}
                </Badge>
              )}
            </div>

            {node.description && (
              <p className="text-[#C0C8D3] mt-1">{node.description}</p>
            )}

            {node.actions && node.actions.length > 0 && (
              <div className="mt-2 space-y-1">
                {node.actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[#C0C8D3]">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: roleColor }} />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="mt-2 ml-4 border-l-2 border-white/10 pl-2">
            {node.children.map((child) => renderNode(child, depth + 1, roleColor))}
          </div>
        )}
      </div>
    );
  };

  const filteredFlows = selectedRole
    ? roleFlows.filter((flow) => flow.role === selectedRole)
    : roleFlows;

  return (
    <div className="min-h-screen bg-[#0A192F] p-5 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="gap-2 border-white/10 text-[#C0C8D3] hover:bg-[#1E90FF] hover:text-white transition-all rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2 text-[#C0C8D3]">
              <School className="w-4 h-4" />
              SMugFlex 2.0
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] rounded-xl flex items-center justify-center shadow-lg">
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white">System Flow Chart</h1>
              <p className="text-[#C0C8D3]">Complete User Navigation Map & Workflow Diagram</p>
            </div>
          </div>
        </div>

        {/* Login Flow */}
        <Card className="mb-6 p-6 bg-[#132C4A] border border-[#1E90FF] rounded-xl shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white mb-3">🧭 System Entry Flow (Login & Access Control)</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#C0C8D3]">
                  <ChevronRight className="w-4 h-4 text-[#1E90FF]" />
                  <span>User Login → Username + Password + Role Selection</span>
                </div>
                <div className="flex items-center gap-2 text-[#C0C8D3]">
                  <span className="w-4 h-4 text-[#28A745]" />
                  <span>Valid Credentials → Redirect to Role-Based Dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-[#C0C8D3]">
                  <span className="w-4 h-4 text-[#DC3545]" />
                  <span>Invalid Credentials → Show Error Message</span>
                </div>
                <div className="flex items-center gap-2 text-[#C0C8D3]">
                  <span className="w-4 h-4 text-[#FFC107]" />
                  <span>Forgot Password → Password Reset Page (Admin can reset from dashboard)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Role Filter */}
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedRole === null ? 'default' : 'outline'}
              onClick={() => setSelectedRole(null)}
              className="gap-2"
            >
              <span className="w-4 h-4" />
              Show All Roles
            </Button>
          {roleFlows.map((flow) => (
            <Button
              key={flow.role}
              variant={selectedRole === flow.role ? 'default' : 'outline'}
              onClick={() => setSelectedRole(flow.role)}
              className="gap-2"
              style={{
                backgroundColor: selectedRole === flow.role ? flow.color : undefined,
                borderColor: flow.color,
                color: selectedRole === flow.role ? 'white' : flow.color
              }}
            >
              {flow.icon}
              {flow.role}
            </Button>
          ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={expandAll}
              variant="outline"
              className="gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Expand All
            </Button>
            <Button
              onClick={collapseAll}
              variant="outline"
              className="gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              Collapse All
            </Button>
          </div>
        </div>

        {/* Role Flows */}
        <div className="space-y-6">
          {filteredFlows.map((roleFlow) => (
            <Card key={roleFlow.role} className="p-6" style={{ backgroundColor: roleFlow.bgColor }}>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: roleFlow.color }}
                >
                  <div className="text-white">{roleFlow.icon}</div>
                </div>
                <div>
                  <h2 className="text-gray-900">{roleFlow.role} Dashboard</h2>
                  <p className="text-sm text-gray-600">Complete workflow and navigation paths</p>
                </div>
              </div>

              <div className="space-y-2">
                {roleFlow.flows.map((flow) => renderNode(flow, 0, roleFlow.color))}
              </div>
            </Card>
          ))}
        </div>

        {/* Navigation Rules */}
        <Card className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h3 className="text-[#0A2540] mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            🧭 Navigation Flow Rules
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Each dashboard has a <strong>top navigation bar</strong> with role-based home icon, notifications, and profile dropdown</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Left sidebar displays <strong>role-specific buttons</strong> with restricted access</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Every button connects to a <strong>page or modal</strong></span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Status indicators: <Badge variant="default" className="text-xs">Draft</Badge> <Badge variant="secondary" className="text-xs">Submitted</Badge> <Badge variant="default" className="text-xs">Approved</Badge> <Badge variant="destructive" className="text-xs">Locked</Badge></span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Loop arrows show users returning to dashboard after completing actions</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                <span>Subject Teachers <strong>cannot</strong> edit Affective/Psychomotor traits</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Result Compilation Flow */}
        <Card className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
          <h3 className="text-[#0A2540] mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            📋 Complete Result Compilation & Approval Workflow
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#F59E0B] text-white rounded-full flex items-center justify-center flex-shrink-0">1</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Subject Teacher:</strong> Inputs subject scores → Submits to Class Teacher</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#F59E0B] text-white rounded-full flex items-center justify-center flex-shrink-0">2</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Class Teacher:</strong> Reviews all subject scores → Adds Affective & Psychomotor traits → Generates preview</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#F59E0B] text-white rounded-full flex items-center justify-center flex-shrink-0">3</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Class Teacher:</strong> Submits to Admin → Results locked for editing</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#0A2540] text-white rounded-full flex items-center justify-center flex-shrink-0">4</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Admin:</strong> Reviews submission → Approves or Returns with feedback</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#0A2540] text-white rounded-full flex items-center justify-center flex-shrink-0">5</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Admin:</strong> Generates final report cards → Publishes to Parents</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
              <div className="w-8 h-8 bg-[#DC2626] text-white rounded-full flex items-center justify-center flex-shrink-0">6</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900"><strong>Parent:</strong> Views child's results → Downloads/Prints report card</p>
              </div>
            </div>
          </div>
        </Card>

        {/* How to Use */}
        <Card className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <h3 className="text-[#0A2540] mb-4 flex items-center gap-2">
            <span className="w-5 h-5" />
            💡 How to Use This Flow Chart
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span><strong>Click on any section</strong> to expand and view detailed action steps</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span><strong>Filter by role</strong> to see specific workflows for Admin, Teacher, Accountant, or Parent</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span><strong>Use Expand/Collapse All</strong> buttons to view everything at once or reset the view</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span><strong>Color-coded borders</strong> on each card represent the role responsible for that action</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span><strong>Status badges</strong> indicate workflow states: Active, Locked, Pending, or Approved</span>
              </p>
              <p className="text-sm text-gray-700 flex items-start gap-2">
                <span className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <span><strong>Arrow icons (→)</strong> show sequential steps in each workflow process</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <Card className="mt-6 p-6 bg-white">
          <h3 className="text-[#0A2540] mb-4">🎨 Role Color Coding</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roleFlows.map((flow) => (
              <div key={flow.role} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: flow.color }}
                />
                <span className="text-sm text-gray-700">{flow.role}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
