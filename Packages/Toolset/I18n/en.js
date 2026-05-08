const en = {
  resultHeader: 'Tool result',
  errors: {
    unknownTool: 'Unknown tool.',
    missingExpression: 'Missing required parameter: expression.',
    missingText: 'Missing required parameter: text.',
    missingJson: 'Missing required parameter: json.',
    missingUnit: 'Missing required unit parameter.',
    missingDate: 'Missing required parameter: date.',
    missingOperation: 'Missing required parameter: operation.',
    missingTime: 'Missing required parameter: time.',
    missingTimezone: 'Missing required timezone parameter.',
    invalidNumber: 'Missing or invalid number.',
    invalidDate: 'Invalid date. Use YYYY-MM-DD.',
    invalidTime: 'Invalid time. Use HH:MM in 24-hour format.',
    invalidUrl: 'Invalid URL. Include http:// or https://.',
    invalidCoordinate: 'Invalid coordinate. Latitude must be -90 to 90 and longitude must be -180 to 180.',
    invalidGeohash: 'Invalid geohash.',
    invalidBase64: 'Invalid Base64 input.',
    invalidJson: 'Invalid JSON input.',
    invalidTimezone: 'Invalid IANA timezone.',
    invalidWeekday: 'Invalid weekday.',
    invalidCase: 'Invalid target case.'
  },
  tools: [
    {
      name: 'calculate_expression',
      description: 'Evaluate a math expression with constants and common functions.',
      category: 'utility',
      parameters: {
        expression: { type: 'string', required: true, description: 'Math expression to evaluate.' },
        precision: { type: 'number', required: false, description: 'Maximum decimal places, default 6.' }
      }
    },
    {
      name: 'convert_units',
      description: 'Convert common length, weight, temperature, volume, and speed units.',
      category: 'utility',
      parameters: {
        value: { type: 'number', required: true, description: 'Numeric value to convert.' },
        from_unit: { type: 'string', required: true, description: 'Source unit.' },
        to_unit: { type: 'string', required: true, description: 'Target unit.' },
        precision: { type: 'number', required: false, description: 'Maximum decimal places, default 6.' }
      }
    },
    {
      name: 'get_time_in_timezone',
      description: 'Show the current date and time in an IANA timezone.',
      category: 'utility',
      parameters: {
        timezone: { type: 'string', required: true, description: 'IANA timezone name.' },
        locale: { type: 'string', required: false, description: 'Optional locale.' }
      }
    },
    {
      name: 'calculate_date',
      description: 'Perform date calculations: day of week, days between, add/subtract days, add months/years, countdowns, and date info.',
      category: 'datetime',
      parameters: {
        operation: { type: 'string', required: true, description: 'day_of_week, days_between, add_days, subtract_days, add_months, add_years, countdown, or date_info.' },
        date: { type: 'string', required: false, description: 'Primary date in YYYY-MM-DD format. Defaults to today.' },
        date2: { type: 'string', required: false, description: 'Second date for days_between.' },
        amount: { type: 'number', required: false, description: 'Amount for add/subtract operations.' }
      }
    },
    {
      name: 'convert_timezone',
      description: 'Convert a specific date and time from one IANA timezone to another.',
      category: 'datetime',
      parameters: {
        time: { type: 'string', required: true, description: 'Time in HH:MM 24-hour format.' },
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' },
        from_timezone: { type: 'string', required: true, description: 'Source IANA timezone.' },
        to_timezone: { type: 'string', required: true, description: 'Target IANA timezone.' }
      }
    },
    {
      name: 'is_weekend',
      description: 'Check whether a date is a weekend or weekday and show the next weekend.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'business_days_between',
      description: 'Count Monday-Friday business days between two dates, skipping weekends.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: true, description: 'Start date in YYYY-MM-DD format.' },
        date2: { type: 'string', required: true, description: 'End date in YYYY-MM-DD format.' }
      }
    },
    {
      name: 'add_business_days',
      description: 'Add or subtract business days from a date, skipping weekends.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Start date in YYYY-MM-DD format. Defaults to today.' },
        amount: { type: 'number', required: true, description: 'Business days to add. Negative values subtract.' }
      }
    },
    {
      name: 'next_weekday_occurrence',
      description: 'Find the next or previous occurrence of a weekday from a reference date.',
      category: 'datetime',
      parameters: {
        weekday: { type: 'string', required: true, description: 'Weekday name.' },
        date: { type: 'string', required: false, description: 'Reference date in YYYY-MM-DD format. Defaults to today.' },
        direction: { type: 'string', required: false, description: 'next or previous. Defaults to next.' }
      }
    },
    {
      name: 'age_calculator',
      description: 'Calculate exact age from a birth/start date to today or a target date.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: true, description: 'Birth or start date in YYYY-MM-DD format.' },
        date2: { type: 'string', required: false, description: 'Target date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'days_until_birthday',
      description: 'Count days until the next birthday or annual event.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: true, description: 'Birthday in YYYY-MM-DD or MM-DD format.' }
      }
    },
    {
      name: 'get_season',
      description: 'Get the meteorological season for a date in the northern or southern hemisphere.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' },
        hemisphere: { type: 'string', required: false, description: 'northern or southern. Defaults to northern.' }
      }
    },
    {
      name: 'get_month_info',
      description: 'Show month details including start/end dates, weekday counts, and weekend totals.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Any date in the target month. Defaults to current month.' }
      }
    },
    {
      name: 'get_quarter_info',
      description: 'Show quarter start/end dates, elapsed days, remaining days, and progress.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'lunar_phase',
      description: 'Estimate the lunar phase and illumination for a date.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'week_bounds',
      description: 'Get the start and end date of the week containing a date.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Any date in the week. Defaults to today.' },
        week_start: { type: 'string', required: false, description: 'sunday or monday. Defaults to sunday.' }
      }
    },
    {
      name: 'month_bounds',
      description: 'Get first and last day of a month plus month progress.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Any date in the target month. Defaults to current month.' }
      }
    },
    {
      name: 'year_progress',
      description: 'Show day-of-year, days remaining, and percentage progress for a year.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'detailed_difference',
      description: 'Show the precise difference between two dates as years, months, days, weeks, hours, and minutes.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: true, description: 'Start date in YYYY-MM-DD format.' },
        date2: { type: 'string', required: true, description: 'End date in YYYY-MM-DD format.' }
      }
    },
    {
      name: 'nth_weekday_of_month',
      description: 'Find the nth or last weekday in a month.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Any date in the target month. Defaults to current month.' },
        nth: { type: 'number', required: true, description: '1-5 for first-fifth, or -1 for last.' },
        weekday: { type: 'string', required: true, description: 'Weekday name.' }
      }
    },
    {
      name: 'timezone_overlap',
      description: 'Find overlapping 9:00-17:00 business hours between two IANA timezones.',
      category: 'datetime',
      parameters: {
        timezone1: { type: 'string', required: true, description: 'First IANA timezone.' },
        timezone2: { type: 'string', required: true, description: 'Second IANA timezone.' },
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'century_decade_info',
      description: 'Get decade, century, and millennium information for a date.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    },
    {
      name: 'unix_converter',
      description: 'Convert a date to a Unix timestamp or a Unix timestamp to a human-readable date.',
      category: 'datetime',
      parameters: {
        operation: { type: 'string', required: true, description: 'to_unix or from_unix.' },
        date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format for to_unix.' },
        unix_timestamp: { type: 'number', required: false, description: 'Unix timestamp in seconds or milliseconds for from_unix.' }
      }
    },
    {
      name: 'time_until_datetime',
      description: 'Calculate precise time until or since a target date and time.',
      category: 'datetime',
      parameters: {
        date: { type: 'string', required: true, description: 'Target date in YYYY-MM-DD format.' },
        time: { type: 'string', required: false, description: 'Target time in HH:MM. Defaults to 00:00.' },
        timezone: { type: 'string', required: false, description: 'Optional IANA timezone for the target time.' }
      }
    },
    {
      name: 'parse_url',
      description: 'Break a URL into protocol, host, port, path, query, hash, and origin.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL to parse.' }
      }
    },
    {
      name: 'extract_query_params',
      description: 'Extract all query string parameters from a URL.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL whose query parameters should be listed.' }
      }
    },
    {
      name: 'build_url',
      description: 'Build a URL from a base URL, optional path, and query parameters.',
      category: 'url',
      parameters: {
        base: { type: 'string', required: true, description: 'Base URL such as https://example.com.' },
        path: { type: 'string', required: false, description: 'Path to append.' },
        params: { type: 'object', required: false, description: 'Query parameters to append.' }
      }
    },
    {
      name: 'add_utm_params',
      description: 'Append UTM tracking parameters to a URL.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'Base URL.' },
        source: { type: 'string', required: false, description: 'utm_source value.' },
        medium: { type: 'string', required: false, description: 'utm_medium value.' },
        campaign: { type: 'string', required: false, description: 'utm_campaign value.' },
        term: { type: 'string', required: false, description: 'utm_term value.' },
        content: { type: 'string', required: false, description: 'utm_content value.' }
      }
    },
    {
      name: 'remove_tracking_params',
      description: 'Remove common tracking parameters such as utm_*, fbclid, gclid, and ref.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL to clean.' }
      }
    },
    {
      name: 'encode_url',
      description: 'Percent-encode text so it can be used safely in a URL component.',
      category: 'url',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to encode.' }
      }
    },
    {
      name: 'decode_url',
      description: 'Decode percent-encoded URL text back to readable text.',
      category: 'url',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to decode.' }
      }
    },
    {
      name: 'extract_domain',
      description: 'Extract the hostname or bare domain from a URL.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL to inspect.' },
        include_subdomain: { type: 'boolean', required: false, description: 'Return full hostname when true.' }
      }
    },
    {
      name: 'slugify_to_url',
      description: 'Convert a title or phrase into a URL-friendly slug.',
      category: 'url',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to slugify.' }
      }
    },
    {
      name: 'extract_urls_from_text',
      description: 'Find every http or https URL in a block of text.',
      category: 'url',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to scan.' }
      }
    },
    {
      name: 'compare_urls',
      description: 'Compare two URLs side-by-side and show differences by component.',
      category: 'url',
      parameters: {
        url_a: { type: 'string', required: true, description: 'First URL.' },
        url_b: { type: 'string', required: true, description: 'Second URL.' }
      }
    },
    {
      name: 'url_to_markdown_link',
      description: 'Format a URL and optional label as a Markdown link.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL.' },
        label: { type: 'string', required: false, description: 'Optional link label.' }
      }
    },
    {
      name: 'url_to_html_link',
      description: 'Format a URL and optional label as an HTML anchor tag.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL.' },
        label: { type: 'string', required: false, description: 'Optional link label.' },
        open_new_tab: { type: 'boolean', required: false, description: 'Add target and rel attributes.' }
      }
    },
    {
      name: 'url_to_base64',
      description: 'Encode a URL as Base64 or decode Base64 back to a URL.',
      category: 'url',
      parameters: {
        value: { type: 'string', required: true, description: 'URL or Base64 value.' },
        action: { type: 'string', required: false, description: 'encode or decode. Defaults to encode.' }
      }
    },
    {
      name: 'count_url_params',
      description: 'Count query parameters and duplicate query keys in a URL.',
      category: 'url',
      parameters: {
        url: { type: 'string', required: true, description: 'URL to inspect.' }
      }
    },
    {
      name: 'get_distance',
      description: 'Calculate great-circle distance and initial bearing between two coordinates.',
      category: 'geo',
      parameters: {
        lat1: { type: 'number', required: true, description: 'Latitude of point A.' },
        lon1: { type: 'number', required: true, description: 'Longitude of point A.' },
        lat2: { type: 'number', required: true, description: 'Latitude of point B.' },
        lon2: { type: 'number', required: true, description: 'Longitude of point B.' }
      }
    },
    {
      name: 'get_midpoint',
      description: 'Calculate the geographic midpoint between two coordinates.',
      category: 'geo',
      parameters: {
        lat1: { type: 'number', required: true, description: 'Latitude of point A.' },
        lon1: { type: 'number', required: true, description: 'Longitude of point A.' },
        lat2: { type: 'number', required: true, description: 'Latitude of point B.' },
        lon2: { type: 'number', required: true, description: 'Longitude of point B.' }
      }
    },
    {
      name: 'check_point_in_radius',
      description: 'Check whether a coordinate lies within a radius of a center coordinate.',
      category: 'geo',
      parameters: {
        centre_lat: { type: 'number', required: true, description: 'Latitude of the center.' },
        centre_lon: { type: 'number', required: true, description: 'Longitude of the center.' },
        point_lat: { type: 'number', required: true, description: 'Latitude of the point to test.' },
        point_lon: { type: 'number', required: true, description: 'Longitude of the point to test.' },
        radius_km: { type: 'number', required: true, description: 'Radius in kilometers.' }
      }
    },
    {
      name: 'convert_dms_to_dd',
      description: 'Convert degrees-minutes-seconds coordinates to decimal degrees.',
      category: 'geo',
      parameters: {
        degrees: { type: 'number', required: true, description: 'Degrees component.' },
        minutes: { type: 'number', required: true, description: 'Minutes component.' },
        seconds: { type: 'number', required: true, description: 'Seconds component.' },
        direction: { type: 'string', required: true, description: 'N, S, E, or W.' }
      }
    },
    {
      name: 'convert_dd_to_dms',
      description: 'Convert decimal degrees to degrees-minutes-seconds with compass direction.',
      category: 'geo',
      parameters: {
        decimal: { type: 'number', required: true, description: 'Decimal degree value.' },
        axis: { type: 'string', required: true, description: 'lat or lon.' }
      }
    },
    {
      name: 'encode_geohash',
      description: 'Encode a latitude/longitude pair into a geohash.',
      category: 'geo',
      parameters: {
        lat: { type: 'number', required: true, description: 'Latitude.' },
        lon: { type: 'number', required: true, description: 'Longitude.' },
        precision: { type: 'number', required: false, description: 'Hash length 1-12. Defaults to 9.' }
      }
    },
    {
      name: 'decode_geohash',
      description: 'Decode a geohash to center coordinates and bounding box.',
      category: 'geo',
      parameters: {
        hash: { type: 'string', required: true, description: 'Geohash to decode.' }
      }
    },
    {
      name: 'get_map_url',
      description: 'Generate shareable OpenStreetMap, Google Maps, and Apple Maps URLs for coordinates or a place query.',
      category: 'geo',
      parameters: {
        lat: { type: 'number', required: false, description: 'Latitude.' },
        lon: { type: 'number', required: false, description: 'Longitude.' },
        query: { type: 'string', required: false, description: 'Place name or address.' },
        zoom: { type: 'number', required: false, description: 'Zoom 1-19. Defaults to 14.' }
      }
    },
    {
      name: 'generate_uuid',
      description: 'Generate one or more random UUID v4 values.',
      category: 'utility',
      parameters: {
        count: { type: 'number', required: false, description: 'Count, default 1, max 20.' },
        uppercase: { type: 'boolean', required: false, description: 'Return uppercase UUIDs.' }
      }
    },
    {
      name: 'hash_text',
      description: 'Hash text using SHA-1, SHA-256, SHA-384, or SHA-512.',
      category: 'utility',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to hash.' },
        algorithm: { type: 'string', required: false, description: 'sha256, sha1, sha384, or sha512.' }
      }
    },
    {
      name: 'encode_base64',
      description: 'Encode UTF-8 text to Base64.',
      category: 'utility',
      parameters: {
        text: { type: 'string', required: true, description: 'Plain text to encode.' }
      }
    },
    {
      name: 'decode_base64',
      description: 'Decode Base64 text into UTF-8 text.',
      category: 'utility',
      parameters: {
        base64: { type: 'string', required: true, description: 'Base64 text to decode.' }
      }
    },
    {
      name: 'format_json',
      description: 'Validate and pretty-print JSON, optionally sorting keys.',
      category: 'utility',
      parameters: {
        json: { type: 'string', required: true, description: 'JSON text.' },
        indent: { type: 'number', required: false, description: 'Indent size, default 2.' },
        sort_keys: { type: 'boolean', required: false, description: 'Sort keys recursively.' }
      }
    },
    {
      name: 'convert_text_case',
      description: 'Convert text to lower, upper, title, sentence, camel, pascal, snake, kebab, or constant case.',
      category: 'utility',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to transform.' },
        target_case: { type: 'string', required: true, description: 'Target case.' }
      }
    },
    {
      name: 'get_text_stats',
      description: 'Summarize text length, words, lines, sentences, paragraphs, and reading time.',
      category: 'utility',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to analyze.' }
      }
    },
    {
      name: 'generate_password',
      description: 'Generate secure passwords, PINs, memorable passwords, or passphrases.',
      category: 'security',
      parameters: {
        type: { type: 'string', required: false, description: 'password, passphrase, pin, or memorable.' },
        length: { type: 'number', required: false, description: 'Length or word count.' },
        count: { type: 'number', required: false, description: 'How many values to generate, max 10.' },
        include_symbols: { type: 'boolean', required: false, description: 'Include symbols.' },
        include_numbers: { type: 'boolean', required: false, description: 'Include numbers.' },
        include_uppercase: { type: 'boolean', required: false, description: 'Include uppercase letters.' }
      }
    }
  ]
};

export default en;
