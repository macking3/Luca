
import { z } from "zod";

export const ToolSchemas = {
    // --- DYNAMIC REGISTRY ---
    searchAndInstallTools: z.object({
        query: z.string()
    }),

    // --- OFFICE & SKILLS (NEW) ---
    readDocument: z.object({
        filePath: z.string(),
        type: z.enum(['PDF', 'DOCX', 'XLSX', 'PPTX', 'AUTO']).optional()
    }),
    createDocument: z.object({
        fileName: z.string(),
        type: z.enum(['PDF', 'DOCX', 'PPTX']),
        content: z.string(), // For PDF/DOCX text, or JSON structure for PPTX
        title: z.string().optional()
    }),
    analyzeSpreadsheet: z.object({
        filePath: z.string(),
        query: z.string().optional() // e.g., "Calculate average of column B"
    }),
    createCustomSkill: z.object({
        name: z.string(),
        description: z.string(),
        script: z.string(),
        language: z.enum(['python', 'node']),
        inputs: z.array(z.string()).optional()
    }),
    listCustomSkills: z.object({}),
    executeCustomSkill: z.object({
        skillName: z.string(),
        args: z.record(z.string(), z.any())
    }),

    // --- CLIPBOARD & TEXT TOOLS ---
    readClipboard: z.object({}),
    writeClipboard: z.object({
        content: z.string()
    }),
    proofreadText: z.object({
        text: z.string(),
        style: z.enum(['PROFESSIONAL', 'CASUAL', 'ACADEMIC', 'TECHNICAL']).optional()
    }),

    // --- CORE SYSTEM ---
    setSystemAlertLevel: z.object({ 
        level: z.enum(['NORMAL', 'CAUTION', 'CRITICAL']) 
    }),
    initiateLockdown: z.object({}),
    controlDevice: z.object({ 
        deviceId: z.string(), 
        action: z.enum(['on', 'off']) 
    }),
    runDiagnostics: z.object({ 
        scanLevel: z.enum(['quick', 'deep']) 
    }),
    executeTerminalCommand: z.object({ 
        command: z.string() 
    }),
    openInteractiveTerminal: z.object({
        command: z.string()
    }),
    requestFullSystemPermissions: z.object({
        justification: z.string().optional()
    }),
    controlSystem: z.object({
        action: z.string(),
        parameter: z.string().optional(),
        targetApp: z.string().optional(),
        platform: z.string().optional()
    }),
    controlSystemInput: z.object({ 
        type: z.enum(['CLICK', 'TYPE', 'MOVE', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG']), 
        key: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        x2: z.number().optional(),
        y2: z.number().optional()
    }),
    getScreenDimensions: z.object({}),
    
    // --- HIVE MIND (GOD MODE) ---
    broadcastGlobalDirective: z.object({
        command: z.string(),
        scope: z.enum(['ALL', 'SPECIFIC_REGION', 'DEBUG']).optional(),
        forceOverride: z.boolean().optional()
    }),

    // --- KNOWLEDGE & FILES ---
    ingestGithubRepo: z.object({ 
        url: z.string() 
    }),
    readUrl: z.object({ 
        url: z.string() 
    }),
    readScreen: z.object({}),
    changeDirectory: z.object({ 
        path: z.string() 
    }),
    listFiles: z.object({ 
        path: z.string().optional() 
    }),
    readFile: z.object({ 
        path: z.string() 
    }),
    writeProjectFile: z.object({ 
        path: z.string(), 
        content: z.string() 
    }),
    createOrUpdateFile: z.object({ 
        fileName: z.string(), 
        content: z.string() 
    }),
    auditSourceCode: z.object({ 
        language: z.string(),
        snippet: z.string().optional(),
        filePath: z.string().optional()
    }),
    runPythonScript: z.object({ 
        script: z.string() 
    }),
    openCodeEditor: z.object({}),
    
    // --- BUILD & DEPLOY ---
    compileSelf: z.object({
        target: z.enum(['win', 'mac', 'linux']),
        publish: z.boolean().optional()
    }),

    // --- NETWORK & WIRELESS ---
    scanNetwork: z.object({ 
        frequency: z.enum(['2.4GHz', '5GHz', 'ALL']).optional() 
    }),
    generateNetworkMap: z.object({}),
    analyzeNetworkTraffic: z.object({}),
    traceSignalSource: z.object({ 
        targetIdentifier: z.string() 
    }),
    scanBluetoothSpectrum: z.object({}),
    manageBluetoothDevices: z.object({ 
        action: z.enum(['LIST', 'CONNECT', 'DISCONNECT', 'PAIR']),
        deviceId: z.string().optional()
    }),
    deploySystemHotspot: z.object({ 
        ssid: z.string(), 
        password: z.string().optional(),
        securityMode: z.enum(['WPA2', 'WPA3']).optional(),
        generatePassword: z.boolean().optional(),
        isHidden: z.boolean().optional()
    }),
    initiateWirelessConnection: z.object({ 
        targetIdentifier: z.string(),
        protocol: z.enum(['WIFI', 'BLUETOOTH', 'WLAN_DIRECT', 'HOTSPOT']),
        credentials: z.string().optional()
    }),

    // --- MOBILE ---
    generateCompanionPairingCode: z.object({}),
    locateMobileDevice: z.object({}),
    manageMobileDevice: z.object({ 
        deviceId: z.string() 
    }),
    controlMobileDevice: z.object({ 
        action: z.enum(['TAP', 'TEXT', 'KEY', 'SWIPE', 'SCREENSHOT']),
        x: z.number().optional(),
        y: z.number().optional(),
        text: z.string().optional(),
        keyCode: z.number().optional()
    }),
    connectWirelessTarget: z.object({ 
        ip: z.string(),
        port: z.number().optional()
    }),
    exfiltrateData: z.object({ 
        type: z.enum(['SMS', 'CALLS']) 
    }),
    killProcess: z.object({ 
        package: z.string() 
    }),

    // --- MEMORY & GRAPH ---
    storeMemory: z.object({ 
        key: z.string(), 
        value: z.string(), 
        category: z.enum(['PREFERENCE', 'FACT', 'PROTOCOL', 'SECURITY', 'USER_STATE', 'SESSION_STATE', 'AGENT_STATE']) 
    }),
    retrieveMemory: z.object({ 
        query: z.string() 
    }),
    addGraphRelations: z.object({
        triples: z.array(z.object({
            source: z.string(),
            relation: z.string(),
            target: z.string()
        })),
        namespace: z.string().optional()
    }),
    queryGraphKnowledge: z.object({
        entity: z.string(),
        depth: z.number().optional()
    }),
    
    // --- MANAGEMENT ---
    createTask: z.object({ 
        title: z.string(), 
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        description: z.string().optional() 
    }),
    updateTaskStatus: z.object({ 
        taskId: z.string(), 
        status: z.enum(['IN_PROGRESS', 'COMPLETED', 'BLOCKED']) 
    }),
    scheduleEvent: z.object({ 
        title: z.string(), 
        startTimeISO: z.string().optional(),
        type: z.enum(['MEETING', 'DEADLINE', 'MAINTENANCE']) 
    }),
    installCapability: z.object({ 
        capabilityName: z.string(), 
        justification: z.string().optional() 
    }),

    // --- FINANCE (CRYPTO/FOREX) ---
    createWallet: z.object({ 
        chain: z.enum(['ETH', 'SOL', 'BTC']) 
    }),
    analyzeToken: z.object({ 
        symbol: z.string() 
    }),
    executeSwap: z.object({ 
        action: z.enum(['BUY', 'SELL']), 
        token: z.string(), 
        amount: z.number() 
    }),
    createForexAccount: z.object({ 
        leverage: z.number().optional(), 
        baseCurrency: z.string().optional() 
    }),
    analyzeForexPair: z.object({ 
        pair: z.string() 
    }),
    executeForexTrade: z.object({ 
        action: z.enum(['BUY', 'SELL']), 
        pair: z.string(), 
        lots: z.number() 
    }),

    // --- STOCK MARKET (ROBINHOOD STYLE) ---
    analyzeStock: z.object({
        symbol: z.string()
    }),
    getMarketNews: z.object({
        sector: z.string().optional()
    }),

    // --- POLYMARKET (PREDICTION) ---
    searchPolymarket: z.object({
        query: z.string()
    }),
    placePolymarketBet: z.object({
        marketId: z.string(),
        outcome: z.enum(['Yes', 'No']),
        amount: z.number()
    }),
    getPolymarketPositions: z.object({}),

    // --- OSINT & SECURITY & C2 ---
    osintUsernameSearch: z.object({ 
        username: z.string() 
    }),
    osintDomainIntel: z.object({ 
        domain: z.string() 
    }),
    osintDarkWebScan: z.object({
        query: z.string(),
        engines: z.array(z.string()).optional(),
        maxResults: z.number().optional(),
        refineQuery: z.boolean().optional(),
        searchVariations: z.boolean().optional(),
        context: z.string().optional()
    }),
    refineQuery: z.object({
        query: z.string(),
        context: z.string().optional(),
        generateVariations: z.boolean().optional()
    }),
    runNmapScan: z.object({ 
        target: z.string(), 
        scanType: z.enum(['QUICK', 'FULL', 'SERVICE', 'OS_DETECT']) 
    }),
    runMetasploitExploit: z.object({ 
        target: z.string(), 
        module: z.string() 
    }),
    generatePayload: z.object({ 
        os: z.enum(['windows', 'linux', 'android', 'osx']), 
        lhost: z.string(), 
        lport: z.number(),
        format: z.enum(['exe', 'elf', 'apk', 'raw']).optional()
    }),
    generateHttpPayload: z.object({
        lhost: z.string().optional(),
        lport: z.number().optional(),
        fileName: z.string().optional()
    }),
    listC2Sessions: z.object({}),
    sendC2Command: z.object({
        sessionId: z.string(),
        command: z.string()
    }),
    runBurpSuite: z.object({ 
        url: z.string(), 
        scanMode: z.enum(['PASSIVE', 'ACTIVE']).optional() 
    }),
    runWiresharkCapture: z.object({ 
        interface: z.string().optional(), 
        duration: z.number() 
    }),
    runJohnRipper: z.object({ 
        hash: z.string(), 
        format: z.string().optional() 
    }),
    runCobaltStrike: z.object({ 
        listenerIP: z.string(), 
        payloadType: z.enum(['HTTP', 'DNS', 'SMB']).optional() 
    }),
    
    // NEW: L0p4 TOOLKIT INTEGRATIONS
    runSqlInjectionScan: z.object({
        targetUrl: z.string(),
        params: z.string().optional()
    }),
    performStressTest: z.object({
        target: z.string(),
        port: z.number(),
        method: z.enum(['HTTP_FLOOD', 'UDP_FLOOD', 'SYN_FLOOD']),
        duration: z.number().optional()
    }),
    scanPublicCameras: z.object({
        query: z.string().optional(),
        limit: z.number().optional()
    }),
    deployPhishingKit: z.object({
        template: z.enum(['LOGIN_GENERIC', 'GOOGLE', 'BANK']),
        port: z.number().optional()
    }),

    // --- APPS & MEDIA ---
    listInstalledApps: z.object({}),
    closeApp: z.object({ 
        appName: z.string() 
    }),
    getActiveApp: z.object({}),
    runNativeAutomation: z.object({ 
        language: z.enum(['applescript', 'powershell']), 
        script: z.string(),
        description: z.string().optional()
    }),
    sendInstantMessage: z.object({ 
        app: z.string(), 
        recipient: z.string(), 
        message: z.string() 
    }),
    connectSmartTV: z.object({ 
        modelHint: z.string().optional() 
    }),
    controlSmartTV: z.object({ 
        action: z.string(), // Changed from command
        appName: z.string().optional()
    }),
    startRemoteDesktop: z.object({ 
        targetId: z.string() 
    }),
    analyzeAmbientAudio: z.object({ 
        duration: z.number().optional(), 
        sensitivity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(), 
        targetSignature: z.string().optional() 
    }),

    // --- WHATSAPP MCP ---
    whatsappSendMessage: z.object({
        contactName: z.string(),
        message: z.string()
    }),
    whatsappSendImage: z.object({
        contactName: z.string(),
        caption: z.string().optional()
    }),
    whatsappGetContacts: z.object({
        query: z.string().optional()
    }),
    whatsappGetChats: z.object({
        limit: z.number().optional()
    }),
    whatsappReadChat: z.object({
        contactName: z.string(),
        limit: z.number().optional()
    }),

    // --- UTILS ---
    switchPersona: z.object({ 
        mode: z.enum(['RUTHLESS', 'ENGINEER', 'ASSISTANT', 'HACKER', 'CUSTOM']) 
    }),
    searchWeb: z.object({ 
        query: z.string() 
    }),
    searchMaps: z.object({ 
        query: z.string() 
    }),
    analyzeImageDeeply: z.object({}),
    generateOrEditImage: z.object({ 
        prompt: z.string() 
    }),
    setBackgroundImage: z.object({ 
        mode: z.enum(['LAST_GENERATED', 'UPLOADED', 'CLEAR']) 
    }),
    setVoiceAvatar: z.object({
        mode: z.enum(['ARC', 'RUTHLESS', 'ENGINEER', 'HACKER', 'ASSISTANT'])
    })
};

export const validateToolArgs = (toolName: string, args: any) => {
    const schema = ToolSchemas[toolName as keyof typeof ToolSchemas];
    
    if (!schema) {
        return { success: true }; 
    }
    
    const result = schema.safeParse(args);
    if (!result.success) {
        console.error(`[SCHEMA] Validation Failed for ${toolName}:`, result.error.format());
        return { success: false, error: `Schema Validation Failed: ${result.error.message}` };
    }
    return { success: true };
};
