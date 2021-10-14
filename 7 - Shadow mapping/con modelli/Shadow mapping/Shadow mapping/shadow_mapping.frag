#version 330 core
out vec4 FragColor;

in VS_OUT {
    vec3 FragPos;
    vec3 Normal;
    vec2 TexCoords;
} fs_in;

struct DirLight {
    vec3 position;
    
    sampler2D shadowMap;
    mat4 lightSpaceMatrix;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform sampler2D texture_diffuse1;
uniform sampler2D texture_specular1;
uniform DirLight dirLight1;
uniform DirLight dirLight2;

uniform vec3 lightPos;
uniform vec3 viewPos;

uniform float near_plane;
uniform float far_plane;

float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir, sampler2D shadowMap);
vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir);
float LinearizeDepth(float depth);

void main()
{    
    vec3 viewDir = normalize(viewPos - fs_in.FragPos);
    vec3 result = CalcDirLight(dirLight1, fs_in.Normal, viewDir);
    result += CalcDirLight(dirLight2, fs_in.Normal, viewDir);
    
    FragColor = vec4(result, 1.0);
}


float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir, sampler2D shadowMap)
{

    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;
        
    if(projCoords.z > 1.0)
        return 0.0;

    float closestDepth = texture(shadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    float shadow = 0.0;
    vec2 texelSize = 1.0 / textureSize(shadowMap, 0);
    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r; 
            shadow += currentDepth - bias > pcfDepth  ? 1.0 : 0.0;        
        }    
    }
    shadow /= 9.0;
        
    return shadow;
}

vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir)
{
    vec3 lightDir = normalize(light.position - fs_in.FragPos);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 12.0f);
    // combine results
    vec3 ambient  = light.ambient  * vec3(texture(texture_diffuse1, fs_in.TexCoords));
    vec3 diffuse  = light.diffuse  * diff * vec3(texture(texture_diffuse1, fs_in.TexCoords));
    vec3 specular = light.specular * spec * vec3(texture(texture_specular1, fs_in.TexCoords));
    vec4 fragPosLightSpace = light.lightSpaceMatrix * vec4(fs_in.FragPos, 1.0);
    float shadow = ShadowCalculation(fragPosLightSpace, normal, lightDir, light.shadowMap);
    return (ambient + (1.0 - shadow) * (diffuse + specular));
}