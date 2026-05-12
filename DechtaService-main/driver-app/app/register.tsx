import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image,
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DriverAPI, DriverStore } from '../services/api';
import { openCamera, openGallery } from '../utils/fileUpload';
import { isWeb } from '../utils/platform';
import DocumentUploadModal from '../components/DocumentUploadModal';

export default function RegisterScreen() {
  const router = useRouter();
  const { mobile: mobileParam } = useLocalSearchParams<{ mobile: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  
  // 🔥 NEW: State to track which dropdown is currently open
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // 📄 Document modal state
  const [documentModal, setDocumentModal] = useState<{
    visible: boolean;
    documentType: 'aadharFile' | 'panFile' | 'licenseFile' | 'rcFile' | null;
  }>({ visible: false, documentType: null });
  
  const [regData, setRegData] = useState({
    mobile: mobileParam || '',
    fullName: '', dob: '', emergencyContact: '', bloodGroup: '', preferredZone: '',
    vehicleType: '', specificModelId: '', vehicleModelName: '', vehicleWeight: '', vehicleDimensions: '', bodyType: '', vehicleNumber: '',
    accountHolder: '', bankAccount: '', ifscCode: '', bankBranch: '', referralCode: '',
    avatarFile: null,
    // Updated document structure: each doc has front and back
    aadharFile: { front: '', back: '' },
    panFile: { front: '', back: '' },
    licenseFile: { front: '', back: '' },
    rcFile: { front: '', back: '' }
  });

  const updateField = (field: string, value: any) => {
    setRegData(prev => ({ ...prev, [field]: value }));
  };

  // Opens file upload (camera or gallery)
  const handleFileUpload = async (field: string) => {
    const onResult = (uri: string) => {
      if (field === 'avatarFile') {
        updateField(field, uri);
      } else {
        setRegData(prev => {
          const currentArr = (prev as any)[field] || [];
          if (currentArr.length < 2) return { ...prev, [field]: [...currentArr, uri] };
          return prev;
        });
      }
    };

    if (isWeb) {
      const result = await openGallery();
      if (result) onResult(result.uri);
    } else {
      Alert.alert(
        'Upload Document',
        'Choose how you want to upload',
        [
          {
            text: '📷  Take Photo',
            onPress: async () => {
              const result = await openCamera();
              if (result) onResult(result.uri);
            },
          },
          {
            text: '🖼️  Choose from Gallery',
            onPress: async () => {
              const result = await openGallery();
              if (result) onResult(result.uri);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const submitRegistration = async () => {
    // Human-readable field labels for validation messages
    const requiredFields: { key: keyof typeof regData; label: string }[] = [
      { key: 'fullName',        label: 'Full Name' },
      { key: 'dob',             label: 'Date of Birth' },
      { key: 'emergencyContact',label: 'Emergency Contact' },
      { key: 'vehicleType',     label: 'Vehicle Type' },
      { key: 'vehicleNumber',   label: 'Vehicle Number' },
      { key: 'accountHolder',   label: 'Account Holder Name' },
      { key: 'bankAccount',     label: 'Account Number' },
      { key: 'ifscCode',        label: 'IFSC Code' },
      { key: 'bankBranch',      label: 'Bank Branch Name' },
    ];

    const missingLabels = requiredFields
      .filter(f => !regData[f.key])
      .map(f => `• ${f.label}`);

    if (missingLabels.length > 0) {
      const _msg1 = `Please fill in the following:\n\n${missingLabels.join('\n')}`;
      if (Platform.OS === 'web') { window.alert('Required Fields Missing\n\n' + _msg1); }
      else { Alert.alert('Required Fields Missing', _msg1); }
      return;
    }

    // Validate DOB format (DD/MM/YYYY)
    const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dobMatch = regData.dob.match(dobRegex);
    if (!dobMatch) {
      if (Platform.OS === 'web') { window.alert('Invalid Date of Birth\n\nPlease enter your date of birth in DD/MM/YYYY format.'); }
      else { Alert.alert('Invalid Date of Birth', 'Please enter your date of birth in DD/MM/YYYY format.'); }
      return;
    }
    const [, day, month, year] = dobMatch;
    const parsedDate = new Date(`${year}-${month}-${day}`);
    const isValidDate =
      parsedDate instanceof Date &&
      !isNaN(parsedDate.getTime()) &&
      parsedDate < new Date();
    if (!isValidDate) {
      if (Platform.OS === 'web') { window.alert('Invalid Date of Birth\n\nPlease enter a valid date.'); }
      else { Alert.alert('Invalid Date of Birth', 'Please enter a valid date.'); }
      return;
    }

    // Validate emergency contact (10-digit Indian mobile)
    if (!/^[6-9]\d{9}$/.test(regData.emergencyContact)) {
      if (Platform.OS === 'web') { window.alert('Invalid Emergency Contact\n\nPlease enter a valid 10-digit Indian mobile number.'); }
      else { Alert.alert('Invalid Emergency Contact', 'Please enter a valid 10-digit Indian mobile number.'); }
      return;
    }

    if ((regData.vehicleType === '3wheeler' || regData.vehicleType === '4wheeler') && !regData.specificModelId) {
      if (Platform.OS === 'web') { window.alert('Vehicle Model Missing\n\nPlease select a vehicle model.'); }
      else { Alert.alert('Vehicle Model Missing', 'Please select a vehicle model.'); }
      return;
    }

    if ((regData.vehicleType === '3wheeler' || regData.vehicleType === '4wheeler') && !regData.bodyType) {
      if (Platform.OS === 'web') { window.alert('Body Type Missing\n\nPlease select body type (Open or Closed).'); }
      else { Alert.alert('Body Type Missing', 'Please select body type (Open or Closed).'); }
      return;
    }

    // Validate if any document was partially uploaded.
    const docValidation = [
      { name: 'Aadhaar Card',    data: regData.aadharFile },
      { name: 'PAN Card',        data: regData.panFile },
      { name: 'Driving License', data: regData.licenseFile },
      { name: 'RC Book',         data: regData.rcFile },
    ];
    const incompleteDocuments = docValidation
      .filter(doc => (doc.data.front && !doc.data.back) || (!doc.data.front && doc.data.back))
      .map(d => `• ${d.name} (only one side uploaded)`);
    if (incompleteDocuments.length > 0) {
      Alert.alert('Incomplete Documents',
        `Please upload both sides for:\n\n${incompleteDocuments.join('\n')}`);
      return;
    }

    setLoading(true);
    try {
      // 1. Upload avatar if selected
      if (regData.avatarFile) {
        try {
          await DriverAPI.uploadAvatar(regData.avatarFile as string);
        } catch {
          console.warn('Avatar upload failed, continuing registration');
        }
      }

      // 2. Upload KYC documents (both front and back)
      const docUploads = [
        { key: 'aadharFile', type: 'aadhar', data: regData.aadharFile },
        { key: 'panFile', type: 'pan', data: regData.panFile },
        { key: 'licenseFile', type: 'license', data: regData.licenseFile },
        { key: 'rcFile', type: 'rc', data: regData.rcFile },
      ];

      for (const doc of docUploads) {
        if (doc.data.front || doc.data.back) {
          try {
            // Send both front and back images
            await DriverAPI.uploadDocument(
              [doc.data.front, doc.data.back],
              doc.type
            );
          } catch (e) {
            console.warn(`${doc.type} upload failed:`, e);
          }
        }
      }

      // 3. Submit registration data
      console.log('[Register] Submitting with data:', {
        fullName: regData.fullName,
        vehicleType: regData.vehicleType,
        vehicleNumber: regData.vehicleNumber,
        accountHolder: regData.accountHolder,
        bankAccount: regData.bankAccount,
        ifscCode: regData.ifscCode,
        bankBranch: regData.bankBranch,
      });

      const safeVehicleData = regData.vehicleType === '2wheeler'
        ? {
            specificModelId: regData.specificModelId || TWOWHEELER_DEFAULTS.specificModelId,
            vehicleModelName: regData.vehicleModelName || TWOWHEELER_DEFAULTS.vehicleModelName,
            vehicleWeight: regData.vehicleWeight || TWOWHEELER_DEFAULTS.vehicleWeight,
            vehicleDimensions: regData.vehicleDimensions || TWOWHEELER_DEFAULTS.vehicleDimensions,
            bodyType: regData.bodyType || TWOWHEELER_DEFAULTS.bodyType,
          }
        : {
            specificModelId: regData.specificModelId,
            vehicleModelName: regData.vehicleModelName,
            vehicleWeight: regData.vehicleWeight,
            vehicleDimensions: regData.vehicleDimensions,
            bodyType: regData.bodyType,
          };

      const result = await DriverAPI.register({
        fullName: regData.fullName,
        // Convert DD/MM/YYYY → YYYY-MM-DD for backend
        dob: regData.dob.split('/').reverse().join('-'),
        emergencyContact: regData.emergencyContact,
        bloodGroup: regData.bloodGroup,
        preferredZone: regData.preferredZone,
        vehicleType: regData.vehicleType,
        specificModelId: safeVehicleData.specificModelId,
        vehicleModelName: safeVehicleData.vehicleModelName,
        vehicleWeight: safeVehicleData.vehicleWeight,
        vehicleDimensions: safeVehicleData.vehicleDimensions,
        bodyType: safeVehicleData.bodyType,
        vehicleNumber: regData.vehicleNumber,
        accountHolder: regData.accountHolder,
        bankAccount: regData.bankAccount,
        ifscCode: regData.ifscCode,
        bankBranch: regData.bankBranch,
        referralCode: regData.referralCode,
      });

      if (result.success) {
        // Save driver data — always stamp isRegistered so root layout
        // knows onboarding is complete and routes to /(tabs) on cold start.
        const driverToSave = { ...(result.driver || {}), isRegistered: true };
        await DriverStore.set(driverToSave);
        console.log('[Register Success] Driver data saved:', driverToSave);
        // Navigate directly — no extra "OK" tap needed
        router.replace('/(tabs)');
      } else {
        const errorMsg = result.message || 'Registration failed';
        const missingFields = result.missingFields ? `\nMissing: ${result.missingFields.join(', ')}` : '';
        if (Platform.OS === 'web') { window.alert('Registration Failed\n\n' + errorMsg + missingFields); }
        else { Alert.alert('Error', errorMsg + missingFields); }
      }
    } catch (err: any) {
      console.log('[Register Error]', err.message, err);
      if (Platform.OS === 'web') { window.alert('Error\n\n' + (err.message || 'Registration failed. Please try again.')); }
      else { Alert.alert('Error', err.message || 'Registration failed. Please try again.'); }
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  const vehicleModelsData: any = {
    '3wheeler': [
      { id: '3w_500kg', name: '500 kg', weight: '500 kg', length: '5.5 ft' }
    ],
    '4wheeler': [
      { id: '4w_750kg',  name: '750 kg',  weight: '750 kg',  length: '6 ft' },
      { id: '4w_1200kg', name: '1200 kg', weight: '1200 kg', length: '7 ft' },
      { id: '4w_1700kg', name: '1700 kg', weight: '1700 kg', length: '8 ft' },
      { id: '4w_2500kg', name: '2500 kg', weight: '2500 kg', length: '10 ft' }
    ]
  };

  const TWOWHEELER_DEFAULTS = {
    specificModelId:   '2w_standard',
    vehicleModelName:  'Standard Bike',
    vehicleWeight:     '20',
    vehicleDimensions: '3 ft',
    bodyType:          'Open',
  };

  const activeVehicleModels = vehicleModelsData[regData.vehicleType];
  const themeStyles = isDark ? darkTheme : lightTheme;

  const SelectionGrid = ({ options, selected, onSelect }: any) => (
    <View style={styles.gridContainer}>
      {options.map((opt: string) => (
        <TouchableOpacity 
          key={opt} 
          onPress={() => onSelect(opt)}
          style={[styles.gridItem, themeStyles.inputBox, selected === opt && styles.gridItemActive]}
        >
          <Text style={[styles.gridText, themeStyles.text, selected === opt && styles.gridTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 🔥 NEW: A reusable smart Dropdown component for your grids
  const DropdownGrid = ({ label, placeholder, options, selected, fieldKey }: any) => {
    const isOpen = activeDropdown === fieldKey;
    return (
      <View style={{ marginBottom: 4 }}>
        <Text style={[styles.label, themeStyles.subText]}>{label}</Text>
        <TouchableOpacity 
          style={[styles.input, themeStyles.inputBox, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
          onPress={() => toggleDropdown(fieldKey)}
          activeOpacity={0.7}
        >
          <Text style={[themeStyles.text, !selected && { color: '#94a3b8' }]}>
            {selected || placeholder}
          </Text>
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
        </TouchableOpacity>
        
        {isOpen && (
          <View style={{ marginTop: 8, marginBottom: 8, paddingHorizontal: 4 }}>
            <SelectionGrid 
              options={options} 
              selected={selected} 
              onSelect={(v: string) => { 
                updateField(fieldKey, v); 
                setActiveDropdown(null); // Auto-hides grid after user clicks an option
              }} 
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={isDark ? '#fff' : '#0f172a'} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, themeStyles.text]}>Complete Profile</Text>
              <Text style={themeStyles.subText}>Fill in your details to start earning</Text>
            </View>
          </View>

          {/* AVATAR UPLOAD */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={[styles.avatarBox, themeStyles.inputBox]} onPress={() => handleFileUpload('avatarFile')}>
              {regData.avatarFile ? (
                <Image source={{ uri: regData.avatarFile as string }} style={styles.avatarPreview} />
              ) : (
                <>
                  <Feather name="camera" size={32} color={isDark ? '#64748b' : '#94a3b8'} />
                  <Text style={[styles.avatarText, themeStyles.subText]}>UPLOAD PHOTO</Text>
                </>
              )}
            </TouchableOpacity>
            {regData.avatarFile && (
              <TouchableOpacity onPress={() => updateField('avatarFile', null)} style={styles.retakeAvatarBtn}>
                <Feather name="refresh-cw" size={12} color="#0284c7" />
                <Text style={styles.retakeAvatarText}>Retake</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* PERSONAL DETAILS */}
          <View style={[styles.card, themeStyles.card]}>
            <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>
            
            <Text style={[styles.label, themeStyles.subText]}>Full Name (as per Aadhaar) <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="e.g. Ramesh Kumar" placeholderTextColor="#94a3b8" value={regData.fullName} onChangeText={(v) => updateField('fullName', v)} />

            <Text style={[styles.label, themeStyles.subText]}>Date of Birth <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, themeStyles.inputBox, themeStyles.text]}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={10}
              value={regData.dob}
              onChangeText={(v) => {
                // Strip non-digits
                const digits = v.replace(/\D/g, '');
                // Auto-insert slashes: DD/MM/YYYY
                let formatted = digits;
                if (digits.length >= 3 && digits.length <= 4) {
                  formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                } else if (digits.length >= 5) {
                  formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
                }
                updateField('dob', formatted);
              }}
            />

            <Text style={[styles.label, themeStyles.subText]}>Emergency Contact Number <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="+91 XXXXXXXXXX" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} value={regData.emergencyContact} onChangeText={(v) => updateField('emergencyContact', v.replace(/\D/g, '').slice(0, 10))} />

            {/* 🔥 UPDATED: Grids are now smart dropdowns! */}
            <DropdownGrid 
              label="Blood Group" 
              placeholder="Select Blood Group"
              options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} 
              selected={regData.bloodGroup} 
              fieldKey="bloodGroup" 
            />

            <DropdownGrid 
              label="Preferred Delivery Zone" 
              placeholder="Select Zone"
              options={['North Chennai', 'South Chennai', 'Central Chennai', 'OMR & ECR']} 
              selected={regData.preferredZone} 
              fieldKey="preferredZone" 
            />
          </View>

          {/* VEHICLE INFO */}
          <View style={[styles.card, themeStyles.card]}>
            <Text style={styles.cardTitle}>VEHICLE INFORMATION</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[
                { id: '2wheeler', label: '2 Wheeler', icon: 'package' },
                { id: '3wheeler', label: '3 Wheeler', icon: 'truck' },
                { id: '4wheeler', label: '4 Wheeler', icon: 'truck' }
              ].map(v => (
                <TouchableOpacity key={v.id} onPress={() => {
                  updateField('vehicleType', v.id);
                  updateField('specificModelId', ''); updateField('vehicleModelName', '');
                  updateField('vehicleWeight', ''); updateField('vehicleDimensions', '');
                  updateField('bodyType', '');
                  if (v.id === '2wheeler') {
                    updateField('specificModelId',   TWOWHEELER_DEFAULTS.specificModelId);
                    updateField('vehicleModelName',  TWOWHEELER_DEFAULTS.vehicleModelName);
                    updateField('vehicleWeight',     TWOWHEELER_DEFAULTS.vehicleWeight);
                    updateField('vehicleDimensions', TWOWHEELER_DEFAULTS.vehicleDimensions);
                    updateField('bodyType',          TWOWHEELER_DEFAULTS.bodyType);
                  }
                }} style={[styles.vehicleTypeBtn, themeStyles.inputBox, regData.vehicleType === v.id && styles.gridItemActive]}>
                  <Feather name={v.icon as any} size={24} color={regData.vehicleType === v.id ? '#0284c7' : '#94a3b8'} />
                  <Text style={[styles.vehicleTypeText, regData.vehicleType === v.id ? styles.gridTextActive : themeStyles.subText]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vehicle Models — hidden for 2wheeler (auto-set) */}
            {regData.vehicleType === '2wheeler' && (
              <View style={[{backgroundColor:'#EFF6FF',borderColor:'#BFDBFE',borderWidth:1.5,borderRadius:12,padding:12,marginBottom:16}]}>
                <Text style={{fontWeight:'700',color:'#0284C7',fontSize:14,marginBottom:4}}>Standard Bike — Fixed Specs</Text>
                <Text style={themeStyles.subText}>Max Load: 20 kg  •  Dimensions: 3 ft  •  Body: Open</Text>
              </View>
            )}
            {regData.vehicleType !== '2wheeler' && activeVehicleModels && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, themeStyles.subText]}>Select Vehicle Model</Text>
                {activeVehicleModels.map((model: any) => (
                  <TouchableOpacity 
                    key={model.id} 
                    onPress={() => {
                      updateField('specificModelId', model.id);
                      updateField('vehicleModelName', model.name);
                      const numericWeight = model.weight.replace(/[^0-9.]/g, '');
                      updateField('vehicleWeight', numericWeight);
                      updateField('vehicleDimensions', model.length);
                    }} 
                    style={[styles.modelBtn, themeStyles.inputBox, regData.specificModelId === model.id && styles.gridItemActive]}
                  >
                    <Text style={[styles.modelBtnName, regData.specificModelId === model.id ? styles.gridTextActive : themeStyles.text]}>{model.name}</Text>
                    <Text style={themeStyles.subText}>Max Load: {model.weight} • Box: {model.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(regData.vehicleType === '4wheeler' || regData.vehicleType === '3wheeler') && regData.specificModelId ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, themeStyles.subText]}>Body Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {['Open', 'Closed'].map(type => (
                    <TouchableOpacity key={type} onPress={() => updateField('bodyType', type)} style={[styles.vehicleTypeBtn, themeStyles.inputBox, regData.bodyType === type && styles.gridItemActive]}>
                      <Text style={[styles.vehicleTypeText, regData.bodyType === type ? styles.gridTextActive : themeStyles.subText]}>{type} Body</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={[styles.label, themeStyles.subText]}>Vehicle Registration Number <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="e.g. TN01AB1234" placeholderTextColor="#94a3b8" autoCapitalize="characters" value={regData.vehicleNumber} onChangeText={(v) => updateField('vehicleNumber', v.toUpperCase())} />
          </View>

          {/* KYC DOCUMENTS */}
          <View style={[styles.card, themeStyles.card]}>
            <Text style={styles.cardTitle}>KYC DOCUMENTS</Text>
            <Text style={[styles.docIntroText, themeStyles.subText]}>Please upload both front and back of each document</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {[
                { key: 'aadharFile', label: 'Aadhaar Card', icon: 'credit-card' },
                { key: 'panFile', label: 'PAN Card', icon: 'credit-card' },
                { key: 'licenseFile', label: 'License', icon: 'smartphone' },
                { key: 'rcFile', label: 'RC Book', icon: 'file-text' }
              ].map(doc => {
                const docData = (regData as any)[doc.key] as { front: string; back: string };
                const isBothUploaded = docData && docData.front && docData.back;
                const isPartial = docData && (docData.front || docData.back);
                
                return (
                  <TouchableOpacity
                    key={doc.key}
                    onPress={() => setDocumentModal({ visible: true, documentType: doc.key as any })}
                    style={[
                      styles.docBtn,
                      themeStyles.inputBox,
                      isBothUploaded ? styles.docBtnSuccess : isPartial ? styles.docBtnPartial : styles.docBtnPending
                    ]}
                  >
                    {isBothUploaded ? (
                      <>
                        <View style={styles.docIconCircle}>
                          <Feather name="check-circle" size={22} color="#10b981" />
                        </View>
                        <Text style={[styles.docBtnText, { color: '#10b981' }]}>{"✓ Both Sides"}</Text>
                        <Text style={styles.docRetakeText}>Tap to edit</Text>
                      </>
                    ) : isPartial ? (
                      <>
                        <View style={styles.docIconCircle}>
                          <Feather name="alert-circle" size={22} color="#f59e0b" />
                        </View>
                        <Text style={[styles.docBtnText, { color: '#f59e0b' }]}>Incomplete</Text>
                        <Text style={styles.docRetakeText}>Upload both sides</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.docIconCircle}>
                          <Feather name={doc.icon as any} size={22} color="#0284c7" />
                        </View>
                        <Text style={[styles.docBtnText, themeStyles.subText]}>{doc.label}</Text>
                        <View style={styles.docUploadHint}>
                          <Feather name="camera" size={11} color="#94a3b8" />
                          <Text style={styles.docUploadHintText}>Front & Back</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* BANK DETAILS */}
          <View style={[styles.card, themeStyles.card]}>
            <Text style={styles.cardTitle}>BANKING DETAILS</Text>

            <Text style={[styles.label, themeStyles.subText]}>Account Holder Name <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="As per bank records" placeholderTextColor="#94a3b8" value={regData.accountHolder} onChangeText={(v) => updateField('accountHolder', v)} />

            <Text style={[styles.label, themeStyles.subText]}>Account Number <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="e.g. 1234567890123" placeholderTextColor="#94a3b8" keyboardType="number-pad" value={regData.bankAccount} onChangeText={(v) => updateField('bankAccount', v)} />

            <Text style={[styles.label, themeStyles.subText]}>IFSC Code <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="e.g. SBIN0001234" placeholderTextColor="#94a3b8" autoCapitalize="characters" value={regData.ifscCode} onChangeText={(v) => updateField('ifscCode', v.toUpperCase())} />

            <Text style={[styles.label, themeStyles.subText]}>Bank Branch Name <Text style={styles.required}>*</Text></Text>
            <TextInput style={[styles.input, themeStyles.inputBox, themeStyles.text]} placeholder="e.g. Anna Nagar, Chennai" placeholderTextColor="#94a3b8" value={regData.bankBranch} onChangeText={(v) => updateField('bankBranch', v)} />
          </View>

          {/* REFERRAL */}
          <View style={[styles.card, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={styles.cardTitle}>REFERRAL CODE</Text>
            <TextInput style={[styles.input, { backgroundColor: isDark ? '#172554' : '#ffffff' }, themeStyles.text]} placeholder="Enter Code (Optional)" placeholderTextColor="#94a3b8" autoCapitalize="characters" value={regData.referralCode} onChangeText={(v) => updateField('referralCode', v.toUpperCase())} />
          </View>

          {/* SUBMIT */}
          <TouchableOpacity style={styles.submitBtn} onPress={submitRegistration} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Registration</Text>}
          </TouchableOpacity>

        </ScrollView>

        {/* Document Upload Modal */}
        {documentModal.documentType && (
          <DocumentUploadModal
            visible={documentModal.visible}
            documentName={
              ({
                aadharFile: 'Aadhaar Card',
                panFile: 'PAN Card',
                licenseFile: 'Driving License',
                rcFile: 'RC Book'
              } as any)[documentModal.documentType] || ''
            }
            frontImageUri={(regData as any)[documentModal.documentType]?.front}
            backImageUri={(regData as any)[documentModal.documentType]?.back}
            onFrontSelected={(uri) => {
              const docType = documentModal.documentType;
              if (docType) {
                updateField(docType, {
                  ...(regData as any)[docType],
                  front: uri
                });
              }
            }}
            onBackSelected={(uri) => {
              const docType = documentModal.documentType;
              if (docType) {
                updateField(docType, {
                  ...(regData as any)[docType],
                  back: uri
                });
              }
            }}
            onClose={() => setDocumentModal({ visible: false, documentType: null })}
            isDark={isDark}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  backButton: { marginRight: 16, padding: 8 },
  title: { fontSize: 26, fontWeight: 'bold' },
  
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarBox: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.1, shadowRadius: 10 },
  avatarText: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 12, fontWeight: '900', color: '#0284c7', letterSpacing: 1.5, marginBottom: 16 },
  docIntroText: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  
  input: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  required: { color: '#ef4444', fontSize: 13 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  gridItemActive: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  gridText: { fontWeight: 'bold', fontSize: 14 },
  gridTextActive: { color: '#0284c7' },
  
  vehicleTypeBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  vehicleTypeText: { fontSize: 11, fontWeight: 'bold', marginTop: 8, textTransform: 'uppercase' },
  
  modelBtn: { padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', marginBottom: 8 },
  modelBtnName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  
  docBtn: { width: '48%', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  docBtnPending: { borderColor: '#e2e8f0', borderStyle: 'dashed' },
  docBtnPartial: { borderColor: '#f59e0b', borderStyle: 'solid', backgroundColor: '#fffbeb' },
  docBtnSuccess: { borderColor: '#10b981', borderStyle: 'solid', backgroundColor: '#ecfdf5' },
  docBtnText: { fontSize: 11, fontWeight: 'bold', marginTop: 6, textTransform: 'uppercase' },
  docIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  docUploadHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  docUploadHintText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  docThumb: { width: '100%', height: 70, borderRadius: 10, marginBottom: 6 },
  docUploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docRetakeText: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  avatarPreview: { width: 110, height: 110, borderRadius: 55 },
  retakeAvatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  retakeAvatarText: { fontSize: 12, color: '#0284c7', fontWeight: '700' },
  
  submitBtn: { backgroundColor: '#0284c7', height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0284c7', shadowOpacity: 0.3, shadowRadius: 8, marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

const lightTheme = StyleSheet.create({
  container: { backgroundColor: '#f8fafc' },
  text: { color: '#0f172a' },
  subText: { color: '#64748b' },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  inputBox: { backgroundColor: '#f1f5f9' },
});

const darkTheme = StyleSheet.create({
  container: { backgroundColor: '#0f172a' },
  text: { color: '#ffffff' },
  subText: { color: '#94a3b8' },
  card: { backgroundColor: '#1e293b', borderColor: '#334155' },
  inputBox: { backgroundColor: '#0f172a' },
});
