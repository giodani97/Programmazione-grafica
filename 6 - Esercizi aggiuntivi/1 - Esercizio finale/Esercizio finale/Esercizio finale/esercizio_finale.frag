#version 330 core
out vec4 FragColor;

struct Material {
    //aggiungiamo la normal
    sampler2D diffuse;
    sampler2D specular;
    sampler2D normal;
    float shininess;
};

in VS_OUT {
    vec3 FragPos;
    vec2 TexCoords;
    vec3 Normal;
    //vec3 TangentLightPos;
    vec3 TangentViewPos;
    vec3 TangentFragPos;
    mat3 TBN;
} fs_in;

struct DirLight {
    vec3 direction;
    
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

struct PointLight {
    vec3 position;
    
    float constant;
    float linear;
    float quadratic;
    
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

struct SpotLight {
    vec3 position;
    vec3 direction;
    float cutOff;
    float outerCutOff;
  
    float constant;
    float linear;
    float quadratic;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;       
};

#define NR_POINT_LIGHTS 1

uniform DirLight dirLight;
uniform PointLight pointLights[NR_POINT_LIGHTS];
uniform SpotLight spotLight;
uniform Material material;

uniform vec3 viewPos;

// Funzioni usate per il calcolo della luce //
vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir);
vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 viewDir);
vec3 CalcSpotLight(SpotLight light, vec3 normal, vec3 fragPos, vec3 viewDir);

void main()
{    
    vec3 normal = texture(material.normal, fs_in.TexCoords).rgb; //prendiamo la texture
    normal = normalize(normal * 2.0 - 1.0); 

    vec3 norm = normalize(fs_in.Normal); //come nell'esercizio luci multiple

    vec3 tanViewDir = normalize(fs_in.TangentViewPos - fs_in.TangentFragPos); //aggiugniamo tangente
    vec3 viewDir = normalize(viewPos - fs_in.FragPos); //uguale a luci multiple
    
    // == =====================================================
    // Our lighting is set up in 3 phases: directional, point lights and an optional flashlight
    // For each phase, a calculate function is defined that calculates the corresponding color
    // per lamp. In the main() function we take all the calculated colors and sum them up for
    // this fragment's final color.
    // == =====================================================

    // phase 1: directional lighting
    vec3 result = CalcDirLight(dirLight, norm, viewDir);
    // phase 2: point lights -> IN TANGENT SPACE
    for(int i = 0; i < NR_POINT_LIGHTS; i++)
        result += CalcPointLight(pointLights[i], normal, fs_in.TangentFragPos, tanViewDir);
    // phase 3: spot light
    result += CalcSpotLight(spotLight, norm, fs_in.FragPos, viewDir);

    FragColor = vec4(result, 1.0);
}

// Calcolo il colore per quando uso la luce direzionale //
// Uguale al multiple lights
vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir)
{
    vec3 lightDir = normalize(-light.direction);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    // combine results
    // TexCoords va sostituito con fs_in.TexCoords, perchè le abbiamo salvate li le coordinate
    vec3 ambient = light.ambient * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 diffuse = light.diffuse * diff * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 specular = light.specular * spec * vec3(texture(material.specular, fs_in.TexCoords));
    return (ambient + diffuse + specular);
}

// calculates the color when using a point light.
// Rispetto alle luci multiple dobbiamo moltiplicare la light.position per la matrice TBN
vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 viewDir)
{
    //moltiplichiamo la posizione della luce per la matrice TBN 
    //è l'unico cambiamento rispetto all'esercizio delle luci multiple (in questa funzione)
    vec3 lightDir = normalize((fs_in.TBN * light.position) - fragPos);

    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    // attenuation
    float distance = length((fs_in.TBN * light.position) - fragPos);
    float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * (distance * distance));
    // combine results
    // TexCoords va sostituito con fs_in.TexCoords, perchè le abbiamo salvate li le coordinate
    vec3 ambient = light.ambient * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 diffuse = light.diffuse * diff * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 specular = light.specular * spec * vec3(texture(material.specular, fs_in.TexCoords));
    ambient *= attenuation;
    diffuse *= attenuation;
    specular *= attenuation;
    return (ambient + diffuse + specular);
}

// calculates the color when using a spot light.
// uguale al multiple lights
vec3 CalcSpotLight(SpotLight light, vec3 normal, vec3 fragPos, vec3 viewDir)
{
    vec3 lightDir = normalize(light.position - fragPos);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    // attenuation
    float distance = length(light.position - fragPos);
    float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * (distance * distance));    
    // spotlight intensity
    float theta = dot(lightDir, normalize(-light.direction)); 
    float epsilon = light.cutOff - light.outerCutOff;
    float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);
    // combine results
    // TexCoords va sostituito con fs_in.TexCoords, perchè le abbiamo salvate li le coordinate
    vec3 ambient = light.ambient * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 diffuse = light.diffuse * diff * vec3(texture(material.diffuse, fs_in.TexCoords));
    vec3 specular = light.specular * spec * vec3(texture(material.specular, fs_in.TexCoords));
    ambient *= attenuation * intensity;
    diffuse *= attenuation * intensity;
    specular *= attenuation * intensity;
    return (ambient + diffuse + specular);
}

