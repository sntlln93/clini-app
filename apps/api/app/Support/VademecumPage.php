<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Medications\MedicationDetailData;
use App\Data\Medications\MedicationIngredientData;
use App\Data\Medications\MedicationListingData;

/**
 * Reads the pages and responses of ANMAT's public vademecum lookup (#377, ADR 0031), a ZK application: what it
 * answers is JavaScript widget trees, not data, so each widget is found by its class and its props. Nothing here
 * talks to the network; the adapter does.
 */
class VademecumPage
{
    /**
     * A single-quoted JavaScript string literal, escapes included.
     */
    private const string QUOTED = "'((?:[^'\\\\]|\\\\.)*)'";

    /**
     * A flat props object: ZK never nests braces inside a widget's props.
     */
    private const string PROPS = "\\{((?:[^{}']|'(?:[^'\\\\]|\\\\.)*')*)\\}";

    /**
     * The desktop the page opened, which every event of the session names.
     */
    public static function desktopId(string $html): ?string
    {
        return preg_match('/\\bdt:'.self::QUOTED.'/', $html, $match) === 1 ? self::unescape($match[1]) : null;
    }

    /**
     * The path the page's events go to, with the session in it when the server keeps it in the URL.
     */
    public static function updatePath(string $html): ?string
    {
        return preg_match('/\\buu:'.self::QUOTED.'/', $html, $match) === 1 ? self::unescape($match[1]) : null;
    }

    /**
     * The listing page's inputs and its «Buscar» button, found by their labels so a new component numbering doesn't
     * break the search.
     *
     * @return array{commercial: string, generic: string, search: string}|null
     */
    public static function searchComponents(string $html): ?array
    {
        $commercial = self::inputAfterLabel($html, 'Nombre Comercial:');
        $generic = self::inputAfterLabel($html, 'Nombre Genérico:');
        $search = null;

        foreach (self::widgets($html, 'zul.wgt.Button') as [$uuid, $props]) {
            if (self::prop($props, 'label') === 'Buscar') {
                $search = $uuid;
                break;
            }
        }

        if ($commercial === null || $generic === null || $search === null) {
            return null;
        }

        return ['commercial' => $commercial, 'generic' => $generic, 'search' => $search];
    }

    /**
     * The products a search answered, each with the component that opens its detail.
     *
     * @return list<array{listing: MedicationListingData, detail: string}>
     */
    public static function listing(string $response): array
    {
        $rows = preg_split("/\\['zul\\.grid\\.Row',/", $response) ?: [];
        array_shift($rows);
        $products = [];

        foreach ($rows as $row) {
            $values = [];

            foreach (self::widgets($row, 'zul.wgt.Label') as [, $props]) {
                $values[] = trim((string) self::prop($props, 'value'));
            }

            $detail = null;

            foreach (self::widgets($row, 'zul.wgt.A') as [$uuid, $props]) {
                if (self::prop($props, 'tooltiptext') === 'Ver Detalles') {
                    $detail = $uuid;
                }
            }

            // Certificate, laboratory, commercial name, form, presentation, GTIN and generic name, in that order.
            if (count($values) < 7 || $detail === null || $values[5] === '') {
                continue;
            }

            $products[] = [
                'listing' => new MedicationListingData(
                    gtin: $values[5],
                    certificateNumber: $values[0],
                    laboratory: $values[1],
                    commercialName: $values[2],
                    pharmaceuticalForm: $values[3],
                    presentation: $values[4],
                    genericName: $values[6],
                ),
                'detail' => $detail,
            ];
        }

        return $products;
    }

    /**
     * Where a click on a product's detail sends the browser: the detail page, which reads the chosen product from the
     * session rather than from its URL.
     */
    public static function redirect(string $response): ?string
    {
        $decoded = json_decode($response, true);

        if (! is_array($decoded) || ! is_array($decoded['rs'] ?? null)) {
            return null;
        }

        foreach ($decoded['rs'] as $command) {
            $arguments = is_array($command) && ($command[0] ?? null) === 'redirect' ? ($command[1] ?? null) : null;

            if (is_array($arguments) && is_string($arguments[0] ?? null)) {
                return $arguments[0];
            }
        }

        return null;
    }

    public static function detail(string $html): ?MedicationDetailData
    {
        $fields = self::detailFields($html);
        $gtin = $fields['GTIN:'] ?? null;

        if ($gtin === null) {
            return null;
        }

        return new MedicationDetailData(
            gtin: $gtin,
            ingredients: self::ingredients($html),
            administrationRoute: $fields['Vía de Administración:'] ?? null,
            dispensingCondition: $fields['Condición de Expendio:'] ?? null,
            troquel: $fields['Nº de Troquel:'] ?? null,
        );
    }

    /**
     * Each bold «Name:» label and the first label with a value after it.
     *
     * @return array<string, string>
     */
    private static function detailFields(string $html): array
    {
        $fields = [];
        $pending = null;

        foreach (self::widgets($html, 'zul.wgt.Label') as [, $props]) {
            $value = self::prop($props, 'value');

            if ($value === null || trim($value) === '') {
                continue;
            }

            $value = trim($value);

            if (str_ends_with($value, ':')) {
                $pending = $value;

                continue;
            }

            if ($pending !== null) {
                $fields[$pending] = $value;
                $pending = null;
            }
        }

        return $fields;
    }

    /**
     * @return list<MedicationIngredientData>
     */
    private static function ingredients(string $html): array
    {
        $start = strpos($html, 'Ingrediente (s) Farmacéutico (s) Activo (s)');

        if ($start === false) {
            return [];
        }

        $end = strpos($html, 'Posee Biodisponibilidad', $start);
        $section = substr($html, $start, $end === false ? null : $end - $start);
        $items = preg_split("/\\['zul\\.sel\\.Listitem',/", $section) ?: [];
        array_shift($items);
        $ingredients = [];

        foreach ($items as $item) {
            $cells = array_map(
                fn (array $widget): ?string => self::blankToNull(self::prop($widget[1], 'label')),
                self::widgets($item, 'zul.sel.Listcell'),
            );

            if (($cells[0] ?? null) === null) {
                continue;
            }

            $ingredients[] = new MedicationIngredientData(
                name: $cells[0],
                quantity: $cells[1] ?? null,
                unit: $cells[2] ?? null,
                asName: $cells[3] ?? null,
                asQuantity: $cells[4] ?? null,
                asUnit: $cells[5] ?? null,
            );
        }

        return $ingredients;
    }

    private static function inputAfterLabel(string $html, string $label): ?string
    {
        $position = strpos($html, "value:'{$label}'");

        if ($position === false) {
            return null;
        }

        return self::widgets(substr($html, $position), 'zul.inp.Textbox')[0][0] ?? null;
    }

    /**
     * Every widget of the class, in document order, as its uuid and raw props.
     *
     * @return list<array{0: string, 1: string}>
     */
    private static function widgets(string $source, string $class): array
    {
        $pattern = "/\\['".preg_quote($class, '/')."','(zk_comp_\\d+)',".self::PROPS.'/';
        preg_match_all($pattern, $source, $matches, PREG_SET_ORDER);

        return array_map(fn (array $match): array => [$match[1], $match[2]], $matches);
    }

    private static function prop(string $props, string $name): ?string
    {
        $pattern = '/(?:^|,)'.preg_quote($name, '/').':'.self::QUOTED.'/';

        return preg_match($pattern, $props, $match) === 1 ? self::unescape($match[1]) : null;
    }

    private static function blankToNull(?string $value): ?string
    {
        $value = $value === null ? null : trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * A JavaScript string literal's escapes: `\xHH`, `\uHHHH` and the single-character ones.
     */
    private static function unescape(string $literal): string
    {
        return (string) preg_replace_callback(
            '/\\\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)/s',
            fn (array $match): string => match (strlen($match[1]) > 1 ? $match[1][0] : 'char') {
                'x', 'u' => mb_chr((int) hexdec(substr($match[1], 1)), 'UTF-8'),
                default => match ($match[1]) {
                    'n' => "\n",
                    't' => "\t",
                    'r' => "\r",
                    default => $match[1],
                },
            },
            $literal,
        );
    }
}
