// src/pages/broadcast/components/BulkSchedule.jsx
import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Upload,
  Download,
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileSpreadsheet,
  Repeat,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useBroadcastStore } from '@/stores/broadcastStore';
import useAuthStore from '@/lib/auth-store';
import { PlatformIcon } from './PlatformIcon';
import { toast } from 'sonner';
import { format, addDays, addWeeks, setHours, setMinutes, startOfWeek, getDay } from 'date-fns';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

const FREQUENCY_OPTIONS = [
  { value: 'week', label: 'per week' },
  { value: 'day', label: 'per day' },
];

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
              currentStep === step.id
                ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white'
                : currentStep > step.id
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--surface-secondary)] text-[var(--text-tertiary)]'
            )}
          >
            {currentStep > step.id ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-12 transition-colors',
                currentStep > step.id
                  ? 'bg-[var(--brand-primary)]'
                  : 'bg-[var(--glass-border)]'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CSVUploadStep({ onUpload, onDownloadTemplate }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(file);
    setError(null);

    // Read and preview CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').slice(0, 6); // Preview first 5 rows + header
      setPreview(lines);
      onUpload(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upload CSV File</h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Import multiple posts from a spreadsheet
        </p>
      </div>

      {/* Template Download */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onDownloadTemplate}
          className="border-[var(--glass-border)] text-[var(--text-secondary)]"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
            : 'border-[var(--glass-border)] bg-[var(--surface-secondary)]/50',
          error && 'border-red-500'
        )}
      >
        <FileSpreadsheet className={cn(
          'mb-3 h-12 w-12',
          file ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'
        )} />
        
        {file ? (
          <div className="text-center">
            <p className="font-medium text-[var(--text-primary)]">{file.name}</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[var(--text-primary)]">
              Drag and drop your CSV file here
            </p>
            <p className="mb-4 text-sm text-[var(--text-tertiary)]">or</p>
            <label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" className="cursor-pointer border-[var(--glass-border)]" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
                </span>
              </Button>
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* CSV Preview */}
      {preview && (
        <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
          <div className="bg-[var(--surface-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)]">
            Preview
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {preview.map((line, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      idx === 0 ? 'bg-[var(--surface-secondary)] font-medium' : '',
                      'border-b border-[var(--glass-border)] last:border-0'
                    )}
                  >
                    {line.split(',').map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap"
                      >
                        {cell.trim().slice(0, 30)}
                        {cell.trim().length > 30 && '...'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RecurringScheduleStep({ config, onChange }) {
  const { postsPerPeriod, period, selectedDays, times, useAiTiming } = config;

  const addTime = () => {
    if (times.length < 5) {
      onChange({ times: [...times, '12:00'] });
    }
  };

  const removeTime = (index) => {
    onChange({ times: times.filter((_, i) => i !== index) });
  };

  const updateTime = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    onChange({ times: newTimes });
  };

  const toggleDay = (dayId) => {
    const newDays = selectedDays.includes(dayId)
      ? selectedDays.filter((d) => d !== dayId)
      : [...selectedDays, dayId];
    onChange({ selectedDays: newDays });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Schedule Settings</h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Configure your recurring posting schedule
        </p>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label className="text-[var(--text-primary)]">Post Frequency</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={10}
            value={postsPerPeriod}
            onChange={(e) => onChange({ postsPerPeriod: parseInt(e.target.value) || 1 })}
            className="w-20 bg-[var(--surface-secondary)] border-[var(--glass-border)]"
          />
          <span className="text-[var(--text-secondary)]">times</span>
          <Select value={period} onValueChange={(v) => onChange({ period: v })}>
            <SelectTrigger className="w-32 bg-[var(--surface-secondary)] border-[var(--glass-border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Days of Week */}
      <div className="space-y-2">
        <Label className="text-[var(--text-primary)]">Preferred Days</Label>
        <div className="flex gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                selectedDays.includes(day.id)
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
              )}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Times */}
      <div className="space-y-2">
        <Label className="text-[var(--text-primary)]">Preferred Times</Label>
        <div className="space-y-2">
          {times.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select value={time} onValueChange={(v) => updateTime(index, v)}>
                <SelectTrigger className="w-40 bg-[var(--surface-secondary)] border-[var(--glass-border)]">
                  <Clock className="mr-2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {times.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTime(index)}
                  className="h-8 w-8 text-[var(--text-tertiary)] hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {times.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addTime}
              className="border-[var(--glass-border)] text-[var(--text-secondary)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time
            </Button>
          )}
        </div>
      </div>

      {/* AI Timing */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)] p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">AI Optimal Timing</p>
            <p className="text-sm text-[var(--text-tertiary)]">
              Let Signal AI choose the best times within your windows
            </p>
          </div>
        </div>
        <Switch
          checked={useAiTiming}
          onCheckedChange={(v) => onChange({ useAiTiming: v })}
        />
      </div>
    </div>
  );
}

function SchedulePreviewStep({ config, weeks }) {
  const generateSchedule = () => {
    const { postsPerPeriod, period, selectedDays, times } = config;
    const schedule = [];
    const today = new Date();
    const weekStart = startOfWeek(today);

    for (let week = 0; week < weeks; week++) {
      const weekDate = addWeeks(weekStart, week);
      let postsThisWeek = 0;

      for (const dayId of selectedDays) {
        if (postsThisWeek >= postsPerPeriod && period === 'week') break;

        const postDate = addDays(weekDate, dayId);
        if (postDate < today) continue;

        for (const time of times) {
          if (postsThisWeek >= postsPerPeriod && period === 'week') break;

          const [hours, minutes] = time.split(':').map(Number);
          const scheduledDate = setMinutes(setHours(postDate, hours), minutes);

          schedule.push({
            id: `${week}-${dayId}-${time}`,
            date: scheduledDate,
            time: time,
          });
          postsThisWeek++;
        }
      }
    }

    return schedule.slice(0, 20); // Preview up to 20 slots
  };

  const schedule = generateSchedule();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Preview Schedule</h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Review your generated posting slots
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--glass-border)]">
        {schedule.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[var(--text-tertiary)]">
            No slots generated. Adjust your settings.
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {schedule.map((slot, index) => (
              <div
                key={slot.id}
                className="flex items-center gap-4 p-3 hover:bg-[var(--surface-secondary)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-sm font-medium text-[var(--brand-primary)]">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {format(slot.date, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {format(slot.date, 'h:mm a')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="ml-auto border-[var(--glass-border)] text-[var(--text-secondary)]"
                >
                  Empty Slot
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-[var(--surface-secondary)] p-4 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          <strong>{schedule.length}</strong> posting slots will be created for the next{' '}
          <strong>{weeks} weeks</strong>
        </p>
      </div>
    </div>
  );
}

export function BulkSchedule({ open, onClose, onComplete }) {
  const { currentProject } = useAuthStore();
  const projectId = currentProject?.id;

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null); // 'csv' or 'recurring'
  const [csvData, setCsvData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    postsPerPeriod: 3,
    period: 'week',
    selectedDays: [1, 3, 5], // Mon, Wed, Fri
    times: ['10:00', '14:00'],
    useAiTiming: false,
  });
  const [weeks, setWeeks] = useState(4);

  const steps = [
    { id: 1, label: 'Choose Method' },
    { id: 2, label: 'Configure' },
    { id: 3, label: 'Preview' },
  ];

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep(2);
  };

  const handleConfigChange = (updates) => {
    setScheduleConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleCSVUpload = (data) => {
    setCsvData(data);
  };

  const downloadTemplate = () => {
    const template = 'content,platforms,date,time,hashtags,media_url\n"Your post content here","facebook,instagram","2026-01-15","10:00","marketing,smallbusiness","https://example.com/image.jpg"\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-schedule-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate generation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Schedule slots created successfully!');
      onComplete?.();
      onClose();
    } catch (error) {
      toast.error('Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!mode;
    if (step === 2) {
      if (mode === 'csv') return !!csvData;
      return scheduleConfig.selectedDays.length > 0 && scheduleConfig.times.length > 0;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[var(--glass-bg)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Calendar className="h-5 w-5 text-[var(--brand-primary)]" />
            Bulk Schedule
          </DialogTitle>
          <DialogDescription className="text-[var(--text-tertiary)]">
            Create multiple scheduled posts at once
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} steps={steps} />

        {/* Step 1: Choose Method */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md bg-[var(--glass-bg)]',
                mode === 'csv' && 'ring-2 ring-[var(--brand-primary)]'
              )}
              onClick={() => handleModeSelect('csv')}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <FileSpreadsheet className="mb-4 h-12 w-12 text-[var(--brand-primary)]" />
                <CardTitle className="mb-2 text-[var(--text-primary)]">Upload CSV</CardTitle>
                <CardDescription className="text-[var(--text-tertiary)]">
                  Import posts from a spreadsheet with dates, content, and platforms
                </CardDescription>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md bg-[var(--glass-bg)]',
                mode === 'recurring' && 'ring-2 ring-[var(--brand-primary)]'
              )}
              onClick={() => handleModeSelect('recurring')}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <Repeat className="mb-4 h-12 w-12 text-[var(--brand-primary)]" />
                <CardTitle className="mb-2 text-[var(--text-primary)]">Recurring Schedule</CardTitle>
                <CardDescription className="text-[var(--text-tertiary)]">
                  Set up a repeating pattern for consistent posting times
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && mode === 'csv' && (
          <CSVUploadStep
            onUpload={handleCSVUpload}
            onDownloadTemplate={downloadTemplate}
          />
        )}

        {step === 2 && mode === 'recurring' && (
          <RecurringScheduleStep
            config={scheduleConfig}
            onChange={handleConfigChange}
          />
        )}

        {/* Step 3: Preview */}
        {step === 3 && mode === 'recurring' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Label className="text-[var(--text-primary)]">Generate for</Label>
              <Select value={weeks.toString()} onValueChange={(v) => setWeeks(parseInt(v))}>
                <SelectTrigger className="w-32 bg-[var(--surface-secondary)] border-[var(--glass-border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SchedulePreviewStep config={scheduleConfig} weeks={weeks} />
          </div>
        )}

        {step === 3 && mode === 'csv' && csvData && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Ready to Import</h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                Your CSV file has been parsed and is ready for import
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-secondary)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Click "Generate Schedule" to create all posts from your CSV
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Generate Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkSchedule;
