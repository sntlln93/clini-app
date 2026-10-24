{{--
    The PDF of one patient's clinical history (#326, ADR 0021). It renders
    the same shape as the JSON export (ClinicalRecordExportResource +
    ClinicalRecordResource), with every instant in the practice's zone.
    Rendered by dompdf, which gets no remote fetches: everything is inline.
--}}
@php
    $at = fn (?string $instant): string => $instant === null
        ? ''
        : \Carbon\CarbonImmutable::parse($instant)->setTimezone($timezone)->format('d/m/Y H:i');
    $day = fn (?string $date): string => $date === null ? '' : \Carbon\CarbonImmutable::parse($date)->format('d/m/Y');
    $name = fn (?array $person): string => $person['name'] ?? 'Profesional sin nombre';
    $statuses = [
        'scheduled' => 'Agendado',
        'confirmed' => 'Confirmado',
        'arrived' => 'Llegó',
        'completed' => 'Completado',
        'no_show' => 'Ausente',
        'cancelled' => 'Cancelado',
        'rescheduled' => 'Reprogramado',
    ];
    $actions = [
        'exceptional_access' => 'Acceso excepcional',
        'notes_viewed' => 'Leyó las notas clínicas',
        'prescriptions_viewed' => 'Leyó la medicación indicada',
        'note_written' => 'Escribió una nota',
        'note_amended' => 'Enmendó una nota',
        'note_annulled' => 'Anuló una nota',
        'prescription_issued' => 'Registró medicación indicada',
        'prescription_amended' => 'Enmendó medicación indicada',
        'record_exported' => 'Exportó la historia clínica',
    ];
    $reasons = [
        'preparing_consultation' => 'Preparar la consulta',
        'study_result' => 'Resultado de estudio',
        'emergency' => 'Urgencia',
        'other' => 'Otro',
    ];
    $documentTypes = ['dni' => 'DNI', 'passport' => 'Pasaporte'];
    $sexes = ['f' => 'Femenino', 'm' => 'Masculino', 'u' => 'Sin especificar'];
    $patient = $record['patient'];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Historia clínica</title>
    <style>
        @page { margin: 22mm 18mm 20mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10pt; color: #1f2933; line-height: 1.4; }
        h1 { font-size: 16pt; margin: 0 0 2mm; }
        h2 { font-size: 12pt; margin: 6mm 0 2mm; border-bottom: 1px solid #cbd2d9; padding-bottom: 1mm; }
        h3 { font-size: 10.5pt; margin: 0 0 1mm; }
        .muted { color: #52606d; }
        .notice { border: 1px solid #cbd2d9; padding: 2.5mm 3mm; margin: 4mm 0; font-size: 9pt; }
        table.identity { border-collapse: collapse; width: 100%; }
        table.identity td { padding: 0.8mm 0; vertical-align: top; }
        table.identity td.label { width: 38mm; color: #52606d; }
        .appointment { margin: 0 0 5mm; page-break-inside: auto; }
        .record { margin: 2mm 0 0 4mm; padding-left: 3mm; border-left: 2px solid #cbd2d9; }
        .version { margin: 1.5mm 0 2.5mm; }
        .body { white-space: pre-wrap; margin: 1mm 0; }
        .annulled { font-weight: bold; }
        ul { margin: 1mm 0; padding-left: 5mm; }
        table.trail { border-collapse: collapse; width: 100%; font-size: 9pt; }
        table.trail th { text-align: left; color: #52606d; font-weight: normal; border-bottom: 1px solid #cbd2d9; padding: 1mm 1.5mm 1mm 0; }
        table.trail td { vertical-align: top; border-bottom: 1px solid #e4e7eb; padding: 1mm 1.5mm 1mm 0; }
        table.trail td.when { width: 30mm; white-space: nowrap; }
        footer { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 8pt; color: #52606d; }
        footer .page:after { content: counter(page) ' de ' counter(pages); }
    </style>
</head>
<body>
    <footer>
        Historia clínica de {{ $patient['name'] }} · {{ $export['organization'] }} · Página <span class="page"></span>
    </footer>

    <h1>Historia clínica</h1>
    <div class="muted">{{ $export['organization'] }}</div>

    <div class="notice">
        Generada el {{ $at($export['generated_at']) }} por {{ $name($export['generated_by']) }}.
        {{ $export['notice'] }}
    </div>

    <h2>Paciente</h2>
    <table class="identity">
        <tr><td class="label">Nombre</td><td>{{ $patient['name'] }}</td></tr>
        <tr>
            <td class="label">Documento</td>
            <td>{{ $documentTypes[$patient['document_type']] ?? $patient['document_type'] }} {{ $patient['document_number'] }}</td>
        </tr>
        @if ($patient['birth_date'])
            <tr><td class="label">Fecha de nacimiento</td><td>{{ $day($patient['birth_date']) }}</td></tr>
        @endif
        @if ($patient['sex'])
            <tr><td class="label">Sexo</td><td>{{ $sexes[$patient['sex']] ?? $patient['sex'] }}</td></tr>
        @endif
        @if ($patient['insurance_provider'])
            <tr>
                <td class="label">Cobertura</td>
                <td>{{ $patient['insurance_provider'] }} {{ $patient['insurance_member_number'] }}</td>
            </tr>
        @endif
    </table>

    <h2>Turnos y actuaciones</h2>
    @forelse ($record['appointments'] as $appointment)
        <div class="appointment">
            <h3>
                {{ $at($appointment['start_at']) }} · {{ $name($appointment['professional']) }}
                @if ($appointment['service']) · {{ $appointment['service'] }} @endif
            </h3>
            <div class="muted">
                {{ $statuses[$appointment['status']] ?? $appointment['status'] }}
                @if ($appointment['reason']) · Motivo: {{ $appointment['reason'] }} @endif
                @if ($appointment['cancelled_at'])
                    · Cancelado el {{ $at($appointment['cancelled_at']) }}
                    @if ($appointment['cancellation_reason']) ({{ $appointment['cancellation_reason'] }}) @endif
                @endif
            </div>

            @foreach ($appointment['clinical_notes'] as $note)
                <div class="record">
                    <strong>Nota clínica</strong>
                    <span class="muted">· escrita por {{ $name($note['author']) }} el {{ $at($note['created_at']) }}</span>
                    @if ($note['annulment'])
                        <div class="annulled">
                            Anulada el {{ $at($note['annulment']['created_at']) }} por {{ $name($note['annulment']['author']) }}.
                            Motivo: {{ $note['annulment']['reason'] }}
                        </div>
                    @endif
                    @foreach ($note['versions'] as $version)
                        <div class="version">
                            <div class="muted">
                                @if ($version['version'] === 1)
                                    Versión 1, {{ $name($version['author']) }}, {{ $at($version['created_at']) }}
                                @else
                                    Enmienda (versión {{ $version['version'] }}), {{ $name($version['author']) }}, {{ $at($version['created_at']) }}
                                    @if ($version['reason']) · Motivo: {{ $version['reason'] }} @endif
                                @endif
                            </div>
                            <div class="body">{{ $version['body'] }}</div>
                            @if ($version['diagnoses'] !== [])
                                <div>Diagnósticos (CIE-10):</div>
                                <ul>
                                    @foreach ($version['diagnoses'] as $diagnosis)
                                        <li>{{ $diagnosis['code'] }} · {{ $diagnosis['description'] }}</li>
                                    @endforeach
                                </ul>
                            @endif
                        </div>
                    @endforeach
                </div>
            @endforeach

            @foreach ($appointment['prescriptions'] as $prescription)
                <div class="record">
                    <strong>Medicación indicada</strong>
                    <span class="muted">· por {{ $name($prescription['author']) }} el {{ $at($prescription['issued_at']) }}</span>
                    @foreach ($prescription['versions'] as $version)
                        <div class="version">
                            <div class="muted">
                                @if ($version['version'] === 1)
                                    Versión 1, {{ $name($version['author']) }}, {{ $at($version['created_at']) }}
                                @else
                                    Enmienda (versión {{ $version['version'] }}), {{ $name($version['author']) }}, {{ $at($version['created_at']) }}
                                    @if ($version['reason']) · Motivo: {{ $version['reason'] }} @endif
                                @endif
                            </div>
                            <ul>
                                @foreach ($version['items'] as $item)
                                    <li>
                                        {{ $item['medication'] }}@if ($item['presentation']), {{ $item['presentation'] }}@endif
                                        · {{ $item['dosage'] }} · Cantidad: {{ $item['quantity'] }}
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endforeach
                </div>
            @endforeach
        </div>
    @empty
        <p class="muted">No hay turnos con este paciente en el consultorio.</p>
    @endforelse

    <h2>Registro de accesos</h2>
    @if ($record['access_log'] === [])
        <p class="muted">No hay accesos registrados.</p>
    @else
        <table class="trail">
            <tr><th>Fecha y hora</th><th>Profesional</th><th>Acción</th></tr>
            @foreach ($record['access_log'] as $entry)
                @php
                    $export = $entry['export'];
                    $what = array_filter([
                        $actions[$entry['action']] ?? $entry['action'],
                        $entry['reason'] ? 'Motivo: '.($reasons[$entry['reason']] ?? $entry['reason']) : null,
                        $entry['appointment'] ? 'Turno del '.$at($entry['appointment']['start_at']) : null,
                        $export ? strtoupper($export['format']).($export['scope'] === 'attended_patients' ? ', con todos sus pacientes atendidos' : '') : null,
                    ]);
                @endphp
                <tr>
                    <td class="when">{{ $at($entry['created_at']) }}</td>
                    <td>{{ $name($entry['professional']) }}</td>
                    <td>{{ implode(' · ', $what) }}</td>
                </tr>
            @endforeach
        </table>
    @endif
</body>
</html>
