import React from 'react';
import { Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';

interface DomainField {
  key: string;
  label: string;
}

interface DomainCardProps {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  fields: DomainField[];
  data: Record<string, number | string>;
  footIcon: React.ReactNode;
  footText: string;
}

function getScoreColor(value: number): string {
  if (value >= 5) return 'bg-green-100 text-green-800';
  if (value >= 4) return 'bg-blue-100 text-blue-800';
  if (value >= 3) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function getScoreLabel(value: number): string {
  if (value >= 5) return 'Excellent';
  if (value >= 4) return 'Very Good';
  if (value >= 3) return 'Good';
  return 'Needs Improvement';
}

function DomainCard({ title, icon, gradientFrom, gradientTo, fields, data, footIcon, footText }: DomainCardProps) {
  return (
    <Card className="border-[#0A2540]/10 shadow-sm">
      <CardHeader className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white px-4 py-3 rounded-t-xl`}>
        <CardTitle className="text-base flex items-center gap-2">
          {title}
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Managed in Student Domains</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => {
            const value = Number(data[field.key]) || 3;
            return (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">{field.label}</Label>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center ${getScoreColor(value)}`}>
                    {value}
                  </div>
                  <span className="text-xs text-gray-600">{getScoreLabel(value)}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
          {footIcon}
          {footText}
        </div>
      </CardContent>
    </Card>
  );
}

const AFFECTIVE_FIELDS: DomainField[] = [
  { key: 'attentiveness', label: 'Attentiveness' },
  { key: 'honesty', label: 'Honesty' },
  { key: 'neatness', label: 'Neatness' },
  { key: 'obedience', label: 'Obedience' },
  { key: 'sense_of_responsibility', label: 'Sense of Responsibility' },
];

const PSYCHOMOTOR_FIELDS: DomainField[] = [
  { key: 'attention_to_direction', label: 'Attention to Direction' },
  { key: 'considerate_of_others', label: 'Concern for Others' },
  { key: 'handwriting', label: 'Handwriting' },
  { key: 'sport', label: 'Sport' },
  { key: 'verbal_fluency', label: 'Verbal Fluency' },
  { key: 'works_well_independently', label: 'Works Well Independently' },
];

interface DomainDisplayProps {
  affectiveData: Record<string, number | string>;
  psychomotorData: Record<string, number | string>;
}

export const DomainDisplay = React.memo(function DomainDisplay({
  affectiveData,
  psychomotorData,
}: DomainDisplayProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DomainCard
        title="Affective Domain"
        icon={<Heart className="w-3 h-3 inline mr-1" />}
        gradientFrom="from-[#8B5CF6]"
        gradientTo="to-[#7C3AED]"
        fields={AFFECTIVE_FIELDS}
        data={affectiveData}
        footIcon={<Heart className="w-3 h-3 inline mr-1" />}
        footText="Update affective domains in Student Domains page"
      />
      <DomainCard
        title="Psychomotor Domain"
        icon={<Activity className="w-3 h-3 inline mr-1" />}
        gradientFrom="from-[#EC4899]"
        gradientTo="to-[#DB2777]"
        fields={PSYCHOMOTOR_FIELDS}
        data={psychomotorData}
        footIcon={<Activity className="w-3 h-3 inline mr-1" />}
        footText="Update psychomotor domains in Student Domains page"
      />
    </div>
  );
});
