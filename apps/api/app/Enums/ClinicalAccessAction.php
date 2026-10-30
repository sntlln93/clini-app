<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What a row of the clinical access log records (#325, ADR 0022). The values are part of the panel's REST contract.
 */
enum ClinicalAccessAction: string
{
    /**
     * A professional without an appointment near today opened the patient's history, with a reason.
     */
    case ExceptionalAccess = 'exceptional_access';
    case NotesViewed = 'notes_viewed';
    case PrescriptionsViewed = 'prescriptions_viewed';
    case NoteWritten = 'note_written';
    case NoteAmended = 'note_amended';
    case NoteAnnulled = 'note_annulled';
    case PrescriptionIssued = 'prescription_issued';
    case PrescriptionAmended = 'prescription_amended';
    case PrescriptionAnnulled = 'prescription_annulled';
    /**
     * The professional indicated medication that matched a current allergy of the patient, confirming the warning
     * (#362, ADR 0030).
     */
    case AllergyWarningOverridden = 'allergy_warning_overridden';
    case VitalSignsViewed = 'vital_signs_viewed';
    case VitalSignRecorded = 'vital_sign_recorded';
    case VitalSignAmended = 'vital_sign_amended';
    case VitalSignAnnulled = 'vital_sign_annulled';
    /**
     * The patient's background: blood type, allergies and antecedents (#361).
     */
    case MedicalHistoryViewed = 'medical_history_viewed';
    case BloodTypeRecorded = 'blood_type_recorded';
    case MedicalHistoryRecorded = 'medical_history_recorded';
    case MedicalHistoryAmended = 'medical_history_amended';
    case MedicalHistoryWithdrawn = 'medical_history_withdrawn';
    /**
     * The patient's history went into an export, alone or with every patient the professional attended.
     */
    case RecordExported = 'record_exported';
    /**
     * The code the patient shares so another professional's records open (#364, ADR 0029): issued for an appointment,
     * mailed to the patient on booking, resent by the practice at the patient's request, and redeemed by the
     * appointment's professional.
     */
    case AccessCodeIssued = 'access_code_issued';
    case AccessCodeSent = 'access_code_sent';
    case AccessCodeResent = 'access_code_resent';
    case AccessCodeRedeemed = 'access_code_redeemed';
}
