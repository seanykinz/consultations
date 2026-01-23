import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { asString, postToFlow } from "@/services/api";
import { toast } from "sonner";

export function ConsultationForm({ consultation, onBack, onSuccess, tokenMode }) {
  const initialForm = {
    suitableSetting: "",
    suitableReasoning: "",
    attendanceIncompatible: "",
    attendanceReasoning: "",
    proposedStartDate: "",
    bandingOrFunding: "",
    additionalInfo: "",
    responderName: "",
    responderRole: "",
  };

  const [formData, setFormData] = React.useState(initialForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState("");

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const isValid =
    (formData.suitableSetting === "Yes" || formData.suitableSetting === "No") &&
    (formData.attendanceIncompatible === "Yes" || formData.attendanceIncompatible === "No") &&
    formData.responderName.trim().length > 0 &&
    formData.responderRole.trim().length > 0 &&
    (formData.suitableSetting !== "No" || formData.suitableReasoning.trim().length > 0) &&
    (formData.attendanceIncompatible !== "Yes" || formData.attendanceReasoning.trim().length > 0) &&
    !(
      formData.suitableSetting === "Yes" &&
      formData.attendanceIncompatible === "No" &&
      (formData.proposedStartDate.trim().length === 0 ||
        formData.bandingOrFunding.trim().length === 0 ||
        formData.additionalInfo.trim().length === 0)
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return toast.error("Please complete all required fields.");
    
    setSubmitting(true);
    setSubmitMessage("");
    try {
      const payload = {
        type: "CONSULTATION_RESPONSE",
        suitableSetting: asString(formData.suitableSetting) || null,
        suitableReasoning: formData.suitableSetting === "No" ? asString(formData.suitableReasoning) || null : null,
        attendanceIncompatible: asString(formData.attendanceIncompatible) || null,
        attendanceReasoning: formData.attendanceIncompatible === "Yes" ? asString(formData.attendanceReasoning) || null : null,
        proposedStartDate: formData.suitableSetting === "Yes" && formData.attendanceIncompatible === "No" ? asString(formData.proposedStartDate) || null : null,
        bandingOrFunding: formData.suitableSetting === "Yes" && formData.attendanceIncompatible === "No" ? asString(formData.bandingOrFunding) || null : null,
        additionalInfo: formData.suitableSetting === "Yes" && formData.attendanceIncompatible === "No" ? asString(formData.additionalInfo) || null : null,
        responderName: asString(formData.responderName) || null,
        responderRole: asString(formData.responderRole) || null,
        consultation: consultation ? { ...consultation } : null,
      };

      await postToFlow(payload);
      toast.success("Consultation response submitted.");
      onSuccess(consultation.id);
    } catch (err) {
      setSubmitMessage(err.message);
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Responding for {consultation?.forename} {consultation?.surname}</CardTitle>
            <CardDescription>
              Impulse ID: {consultation?.impulseId}
              {consultation?.phaseId && <> • Phase: {consultation.phaseId}</>}
            </CardDescription>
          </div>
          {!tokenMode && <Button variant="secondary" onClick={onBack}>← Back to list</Button>}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-7 max-w-3xl">
          <section className="space-y-3">
            <div className="font-semibold">Is your setting suitable for the child/young person?</div>
            <RadioGroup value={formData.suitableSetting} onValueChange={(v) => updateForm("suitableSetting", v)} className="flex gap-6">
              <label className="flex items-center gap-2"><RadioGroupItem value="Yes" /> Yes</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="No" /> No</label>
            </RadioGroup>
            {formData.suitableSetting === "No" && (
              <div className="space-y-2">
                <Label>Reasoning (required)</Label>
                <Textarea rows={4} value={formData.suitableReasoning} onChange={(e) => updateForm("suitableReasoning", e.target.value)} required />
              </div>
            )}
          </section>
          
          <Separator />
          
          <section className="space-y-3">
            <div className="font-semibold">Would attendance be incompatible with efficient education of others?</div>
            <RadioGroup value={formData.attendanceIncompatible} onValueChange={(v) => updateForm("attendanceIncompatible", v)} className="flex gap-6">
              <label className="flex items-center gap-2"><RadioGroupItem value="Yes" /> Yes</label>
              <label className="flex items-center gap-2"><RadioGroupItem value="No" /> No</label>
            </RadioGroup>
            {formData.attendanceIncompatible === "Yes" && (
              <div className="space-y-2">
                <Label>Reasoning (required)</Label>
                <Textarea rows={4} value={formData.attendanceReasoning} onChange={(e) => updateForm("attendanceReasoning", e.target.value)} required />
              </div>
            )}
          </section>

          {formData.suitableSetting === "Yes" && formData.attendanceIncompatible === "No" && (
            <>
              <Separator />
              <section className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label>Proposed Start Date</Label><Input type="date" value={formData.proposedStartDate} onChange={(e) => updateForm("proposedStartDate", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Banding / Funding Requested</Label><Input value={formData.bandingOrFunding} onChange={(e) => updateForm("bandingOrFunding", e.target.value)} required /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Additional Info</Label><Input value={formData.additionalInfo} onChange={(e) => updateForm("additionalInfo", e.target.value)} placeholder="e.g. Course title" required /></div>
              </section>
            </>
          )}
          
          <Separator />
          
          <section className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>Your Name</Label><Input value={formData.responderName} onChange={(e) => updateForm("responderName", e.target.value)} required /></div>
            <div className="space-y-2"><Label>Your Role</Label><Input value={formData.responderRole} onChange={(e) => updateForm("responderRole", e.target.value)} required /></div>
          </section>

          {submitMessage && <Alert variant="destructive"><AlertTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Error</AlertTitle><AlertDescription>{submitMessage}</AlertDescription></Alert>}
          
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || !isValid} className="min-w-44">{submitting ? "Submitting…" : "Submit Response"}</Button>
            <Button type="button" variant="secondary" onClick={() => setFormData(initialForm)} disabled={submitting}>Clear form</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}