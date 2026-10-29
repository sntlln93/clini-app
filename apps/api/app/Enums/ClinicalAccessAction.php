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
     * The patient's history went into an export, alone or with every patient the professional attended.
     */
    case RecordExported = 'record_exported';
}
